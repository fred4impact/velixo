# Deploying to AWS EKS (stage + prod)

One EKS cluster, two namespaces (`ecommerce-stage`, `ecommerce-prod`), one
ArgoCD `ApplicationSet` managing both. Unlike the kind/dev setup, nothing
runs in-cluster except the app itself — MySQL is RDS, storage is S3,
secrets auth is IRSA (no static credentials anywhere).

## Prerequisites

- `eksctl`, `kubectl`, `helm`, `argocd` CLI, `aws` CLI — all on PATH, `aws`
  configured with an account that can create EKS/IAM/RDS/S3/ECR resources
- This repo pushed to a real git remote
- A domain you control (for `ecommerce-stage.example.com` /
  `ecommerce.example.com` — substitute your own throughout)

## 1. Create the cluster

```bash
eksctl create cluster \
  --name ecommerce \
  --region us-east-1 \
  --nodegroup-name standard \
  --node-type t3.medium \
  --nodes 3 --nodes-min 2 --nodes-max 6 \
  --with-oidc               # required for IRSA
```

Takes ~15 minutes. `--with-oidc` provisions the IAM OIDC identity provider
the whole IRSA setup depends on.

## 2. ECR repositories

```bash
aws ecr create-repository --repository-name ecommerce-backend
aws ecr create-repository --repository-name ecommerce-frontend
```

EKS worker nodes pull from ECR via their node IAM role automatically — no
`imagePullSecret` needed (this is why we picked ECR over another registry).

## 3. RDS (MySQL) — one instance per environment

```bash
for env in stage prod; do
  aws rds create-db-instance \
    --db-instance-identifier "ecommerce-$env" \
    --db-instance-class db.t3.micro \
    --engine mysql --engine-version 8.0 \
    --master-username ecommerce \
    --master-user-password "$(openssl rand -base64 24)" \
    --allocated-storage 20 \
    --vpc-security-group-ids <sg-allowing-eks-nodes-on-3306> \
    --no-publicly-accessible
done
```

Note the endpoint + password for each — they go into that environment's
Secrets Manager secret (step 6). Sizing/Multi-AZ/backups are your call;
`db.t3.micro` is a starting point, not a prod recommendation.

## 4. S3 buckets (replace MinIO)

```bash
for env in stage prod; do
  aws s3api create-bucket --bucket "ecommerce-$env-product-images" --region us-east-1
  aws s3api put-bucket-policy --bucket "ecommerce-$env-product-images" --policy '{
    "Version": "2012-10-17",
    "Statement": [{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::ecommerce-'"$env"'-product-images/*"}]
  }'
done

# A dedicated IAM user per env, scoped to just its own bucket, for the
# backend's *write* path (product image uploads via the admin UI).
for env in stage prod; do
  aws iam create-user --user-name "ecommerce-$env-s3"
  aws iam put-user-policy --user-name "ecommerce-$env-s3" --policy-name s3-readwrite --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::ecommerce-'"$env"'-product-images/*"}]
  }'
  aws iam create-access-key --user-name "ecommerce-$env-s3"
  # copy the AccessKeyId / SecretAccessKey for step 6
done
```

## 5. Platform add-ons

```bash
# ingress-nginx (provisions a real NLB)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  -f deployment/platform/ingress-nginx/values-eks.yaml

# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace --set installCRDs=true
kubectl apply -f deployment/platform/cert-manager/cluster-issuer.yaml   # edit the email first

# Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace \
  -f deployment/platform/external-secrets/values.yaml

# ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd wait --for=condition=available --timeout=300s deployment/argocd-server
```

## 6. IRSA roles + Secrets Manager

For **each** of `stage` and `prod`:

```bash
env=stage   # then repeat with env=prod

# IAM role for ESO, trusting this cluster's OIDC provider + the specific
# namespace/ServiceAccount our Helm chart creates (eso-irsa). --role-only
# because the chart itself creates the K8s ServiceAccount — eksctl should
# only manage the IAM side.
eksctl create iamserviceaccount \
  --cluster ecommerce --region us-east-1 \
  --namespace "ecommerce-$env" --name eso-irsa \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --role-only --role-name "ecommerce-$env-eso" \
  --approve
```

Then create that environment's secret (fill in the RDS endpoint/password
from step 3 and the S3 access key/secret from step 4):

```bash
aws secretsmanager create-secret --name "ecommerce/$env/backend" --secret-string '{
  "DATABASE_URL": "mysql://ecommerce:<rds-password>@<rds-endpoint>:3306/ecommerce",
  "JWT_ACCESS_SECRET": "'"$(openssl rand -hex 32)"'",
  "JWT_REFRESH_SECRET": "'"$(openssl rand -hex 32)"'",
  "STRIPE_SECRET_KEY": "sk_live_or_test_...",
  "STRIPE_WEBHOOK_SECRET": "whsec_...",
  "MINIO_ACCESS_KEY": "<s3-access-key-id>",
  "MINIO_SECRET_KEY": "<s3-secret-access-key>"
}'
```

## 7. Point the values files at your account

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
for f in deployment/helm/ecommerce/values-stage.yaml deployment/helm/ecommerce/values-prod.yaml; do
  sed -i '' "s/ACCOUNT_ID/$ACCOUNT_ID/g" "$f"   # macOS sed; drop the '' arg on Linux
done
```

Also replace `ecommerce-stage.example.com` / `ecommerce.example.com` in
those same files (`ingress.frontendHost`/`backendHost`) with your real
domain, and `YOUR_ORG` in `deployment/argocd/*.yaml` with your git remote.
Commit and push all of this.

## 8. First images

> **Note:** `.github/workflows/deploy.yml` is currently removed from the repo
> (only a security scan runs in CI). Restore it before following this step:
> `git checkout 7ef1ebc -- .github/workflows/deploy.yml`

CI (`.github/workflows/deploy.yml`)
handles this on every push to `main` once its repo secrets/vars are set
(`AWS_ROLE_ARN`, `AWS_ACCOUNT_ID`, `AWS_REGION`,
`STRIPE_PUBLISHABLE_KEY_STAGE`/`_PROD`) — see the comments at the top of
that file. To deploy once by hand first:

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com"

docker build --target prod -t "$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ecommerce-backend:bootstrap" ./backend
docker push "$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ecommerce-backend:bootstrap"

docker build --target prod \
  --build-arg NEXT_PUBLIC_API_URL=https://api.ecommerce-stage.example.com \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me \
  -t "$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ecommerce-frontend:bootstrap-stage" ./frontend
docker push "$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ecommerce-frontend:bootstrap-stage"

yq -i '.backend.image.tag = "bootstrap" | .frontend.image.tag = "bootstrap-stage"' deployment/helm/ecommerce/values-stage.yaml
git add deployment/helm/ecommerce/values-stage.yaml && git commit -m "bootstrap stage image" && git push
```

## 9. Deploy via ArgoCD

```bash
kubectl apply -f deployment/argocd/projects/ecommerce-appproject.yaml
kubectl apply -f deployment/argocd/applicationset-eks.yaml

kubectl -n argocd get applications -w   # ecommerce-stage and ecommerce-prod should appear
```

## 10. DNS

```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Create CNAME records for `ecommerce-stage.example.com`,
`api.ecommerce-stage.example.com`, `ecommerce.example.com`,
`api.ecommerce.example.com` pointing at that hostname. cert-manager issues
certificates automatically once DNS resolves and the HTTP01 challenge can
reach the ingress.

## 11. Rollouts and promotion

```bash
kubectl argo rollouts get rollout backend -n ecommerce-stage --watch
kubectl argo rollouts promote backend -n ecommerce-stage
kubectl argo rollouts undo backend -n ecommerce-stage        # rollback
```

To ship a stage-validated build to prod, trigger the `promote-prod` job in
`.github/workflows/deploy.yml` (`workflow_dispatch`, input: the backend
image tag/git-sha from the stage deploy you're promoting) — this rebuilds
only the frontend (prod-flavored `NEXT_PUBLIC_*` build-args) and reuses the
exact same backend image, then updates `values-prod.yaml`.

## Teardown

```bash
kubectl delete -f deployment/argocd/applicationset-eks.yaml
eksctl delete cluster --name ecommerce --region us-east-1
# plus: RDS instances, S3 buckets, ECR repos, Secrets Manager secrets, IAM users/roles created above
```
