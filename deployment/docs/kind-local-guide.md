# Deploying to `kind` (local)

Full GitOps loop running entirely on your machine: kind cluster → ArgoCD →
Helm chart → Argo Rollouts. The only thing that reaches outside your laptop
is AWS Secrets Manager (see [Secrets](#3-external-secrets-operator--secrets-manager)) —
everything else (MySQL, MinIO, Mailpit) runs in-cluster.

## Prerequisites

- Docker Desktop (or another local Docker daemon)
- `kind`, `kubectl`, `helm`, `argocd` CLI, `aws` CLI — all on PATH
- An AWS account with permission to create an IAM user and Secrets Manager
  secrets (only used for this step; nothing else in this guide touches AWS)
- This repo pushed to a real git remote — ArgoCD pulls from git, it can't
  deploy from your local uncommitted changes

## 1. Create the kind cluster

The ingress-nginx controller needs host ports 80/443 mapped in, and a node
labeled so it schedules there:

```bash
cat <<'EOF' | kind create cluster --name ecommerce-dev --config -
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
EOF

kubectl cluster-info --context kind-ecommerce-dev
```

## 2. Install platform add-ons

```bash
# ingress-nginx
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  -f deployment/platform/ingress-nginx/values-kind.yaml

# Argo Rollouts (controller + CRDs)
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
# kubectl plugin, for `kubectl argo rollouts get/promote/undo`
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-darwin-amd64
chmod +x kubectl-argo-rollouts-darwin-amd64 && sudo mv kubectl-argo-rollouts-darwin-amd64 /usr/local/bin/kubectl-argo-rollouts

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

## 3. External Secrets Operator ↔ Secrets Manager

kind has no OIDC federation with AWS, so ESO here uses a static IAM user's
access key (unlike stage/prod, which use IRSA — no static credentials at
all). This is the one manual, non-GitOps step in the whole setup.

```bash
# One-time: create a narrowly-scoped IAM user
aws iam create-user --user-name ecommerce-dev-eso
aws iam put-user-policy --user-name ecommerce-dev-eso --policy-name secrets-read \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"secretsmanager:GetSecretValue","Resource":"arn:aws:secretsmanager:us-east-1:*:secret:ecommerce/dev/*"}]}'
aws iam create-access-key --user-name ecommerce-dev-eso
# ^ copy the AccessKeyId / SecretAccessKey from the output

kubectl create namespace ecommerce-dev
kubectl create secret generic aws-creds -n ecommerce-dev \
  --from-literal=access-key-id=<AccessKeyId> \
  --from-literal=secret-access-key=<SecretAccessKey>
```

Now create the three secrets ESO will sync (adjust values as you like —
these just need to exist and be well-formed JSON):

```bash
aws secretsmanager create-secret --name ecommerce/dev/backend --secret-string '{
  "DATABASE_URL": "mysql://ecommerce:ecommerce@mysql:3306/ecommerce",
  "JWT_ACCESS_SECRET": "dev_access_secret_change_me",
  "JWT_REFRESH_SECRET": "dev_refresh_secret_change_me",
  "STRIPE_SECRET_KEY": "sk_test_replace_me",
  "STRIPE_WEBHOOK_SECRET": "whsec_replace_me",
  "MINIO_ACCESS_KEY": "minioadmin",
  "MINIO_SECRET_KEY": "minioadmin"
}'

aws secretsmanager create-secret --name ecommerce/dev/mysql --secret-string '{
  "MYSQL_ROOT_PASSWORD": "root",
  "MYSQL_USER": "ecommerce",
  "MYSQL_PASSWORD": "ecommerce"
}'

aws secretsmanager create-secret --name ecommerce/dev/minio --secret-string '{
  "MINIO_ACCESS_KEY": "minioadmin",
  "MINIO_SECRET_KEY": "minioadmin"
}'
```

(`ecommerce/dev/backend`'s `DATABASE_URL` must match `ecommerce/dev/mysql`'s
user/password — they're independent secrets because the backend and MySQL
containers read different variable shapes.)

## 4. Build images and load them into kind

No registry involved for local dev — build, then load straight into the
cluster's node:

```bash
docker build --target prod -t ecommerce-backend:dev ./backend
docker build --target prod \
  --build-arg NEXT_PUBLIC_API_URL=http://api.ecommerce.127.0.0.1.nip.io \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me \
  -t ecommerce-frontend:dev ./frontend

kind load docker-image ecommerce-backend:dev --name ecommerce-dev
kind load docker-image ecommerce-frontend:dev --name ecommerce-dev
```

Re-run this (and `kubectl argo rollouts restart backend -n ecommerce-dev`,
since `imagePullPolicy: IfNotPresent` won't notice an image with an
unchanged tag) whenever you change app code and want to see it locally.

## 5. Deploy via ArgoCD

```bash
kubectl apply -f deployment/argocd/projects/ecommerce-appproject.yaml
kubectl apply -f deployment/argocd/application-dev.yaml

# watch it sync
argocd login localhost:8080 --core   # or: kubectl -n argocd port-forward svc/argocd-server 8080:443
kubectl -n argocd get application ecommerce-dev -w
```

Within a minute or two you should see `Synced` / `Healthy`. If not:

```bash
kubectl -n ecommerce-dev get pods
kubectl -n ecommerce-dev describe externalsecret backend-secret   # secret sync issues surface here
```

## 6. Use it

```
http://ecommerce.127.0.0.1.nip.io        storefront
http://api.ecommerce.127.0.0.1.nip.io    API + /api/docs (Swagger)
http://minio.ecommerce.127.0.0.1.nip.io  MinIO (product images)
```

`nip.io` resolves any `*.127.0.0.1.nip.io` hostname to `127.0.0.1` — no
`/etc/hosts` editing needed.

## 7. Rollouts

```bash
# after changing code, rebuild + kind load + restart (step 4), then:
kubectl argo rollouts get rollout backend -n ecommerce-dev --watch
kubectl argo rollouts promote backend -n ecommerce-dev     # past each pause
kubectl argo rollouts undo backend -n ecommerce-dev        # roll back
```

## Teardown

```bash
kind delete cluster --name ecommerce-dev
aws secretsmanager delete-secret --name ecommerce/dev/backend --force-delete-without-recovery
aws secretsmanager delete-secret --name ecommerce/dev/mysql --force-delete-without-recovery
aws secretsmanager delete-secret --name ecommerce/dev/minio --force-delete-without-recovery
aws iam delete-access-key --user-name ecommerce-dev-eso --access-key-id <AccessKeyId>
aws iam delete-user-policy --user-name ecommerce-dev-eso --policy-name secrets-read
aws iam delete-user --user-name ecommerce-dev-eso
```
