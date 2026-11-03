# Installing the Electives: Prometheus/Grafana, Vault, Falco, Karpenter, Litmus, K8sGPT

Numbered install steps for the six tools planned in
`deployment/platform/electives-work-plan.md` (Part 7 of
`notes/devops-course-plan.md`). Same style and assumptions as
`kind-local-guide.md`/`aws-eks-guide.md` — this guide layers on top of
either of those, it doesn't replace them.

**Do these in order** — Phase 1 (Prometheus/Grafana) is a hard prerequisite
for §3, §5, and §6. Phases 2 and 4 have no dependency on 1 and can be done
any time.

## Prerequisites

Everything from `kind-local-guide.md` (or `aws-eks-guide.md`) already
applied: cluster up, ArgoCD running, the `ecommerce` Helm release deployed
and healthy. `helm`/`kubectl` on PATH and pointed at the right cluster.

---

## 1. Prometheus + Grafana

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f deployment/platform/prometheus-grafana/values.yaml

kubectl -n monitoring get pods --watch   # wait for everything Running
```

Turn on the app's own ServiceMonitor + `/metrics` route (already built into
`helm/ecommerce` — `backend/src/metrics`, gated behind `monitoring.enabled`):

```bash
# quick local check:
helm upgrade ecommerce-dev deployment/helm/ecommerce \
  -f deployment/helm/ecommerce/values.yaml -f deployment/helm/ecommerce/values-dev.yaml \
  --set monitoring.enabled=true -n ecommerce-dev

# the real GitOps way: set monitoring.enabled: true in values-dev.yaml,
# commit, push — ArgoCD applies it, same as any other change.
```

Expose Grafana (kind: via ingress, matching how the app itself is exposed;
EKS: same, through the existing ingress-nginx + cert-manager stack):

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3001:80
# http://localhost:3001, admin / admin (values.yaml — change it for anything beyond local use)
```

Import dashboard `11159` or `12230` (Node.js Application Dashboard) for
backend/frontend process metrics.

**Validate:** place an order through the storefront, then in Grafana ->
Explore -> Prometheus, query `http_requests_total{route="/checkout"}` —
confirm it incremented within one scrape interval (15s).

---

## 2. Vault

`dev` only — this replaces the static-AWS-credential requirement from
`kind-local-guide.md` §3, it is not installed on stage/prod (those keep
IRSA + AWS Secrets Manager).

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
helm install vault hashicorp/vault -n vault --create-namespace \
  -f deployment/platform/vault/values.yaml

kubectl -n vault get pods --watch   # vault-0 Running, dev mode auto-unseals
```

Configure Kubernetes auth + load this app's policy:

```bash
kubectl exec -n vault -it vault-0 -- sh -c '
  vault auth enable kubernetes
  vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc:443"
  vault secrets enable -path=internal kv-v2
'

kubectl cp deployment/platform/vault/dev-policy.hcl vault/vault-0:/tmp/dev-policy.hcl
kubectl exec -n vault -it vault-0 -- sh -c '
  vault policy write ecommerce-dev-read /tmp/dev-policy.hcl
  vault write auth/kubernetes/role/ecommerce-dev \
    bound_service_account_names=default \
    bound_service_account_namespaces=ecommerce-dev \
    policies=ecommerce-dev-read \
    ttl=1h
'
```

Load this app's actual dev secrets into Vault (same shape as the AWS
Secrets Manager version in `kind-local-guide.md` §3):

```bash
kubectl exec -n vault -it vault-0 -- vault kv put internal/ecommerce/dev/backend \
  DATABASE_URL="mysql://ecommerce:ecommerce@mysql:3306/ecommerce" \
  JWT_ACCESS_SECRET="dev_access_secret_change_me" \
  JWT_REFRESH_SECRET="dev_refresh_secret_change_me" \
  STRIPE_SECRET_KEY="sk_test_replace_me" \
  STRIPE_WEBHOOK_SECRET="whsec_replace_me" \
  MINIO_ACCESS_KEY="minioadmin" \
  MINIO_SECRET_KEY="minioadmin"

kubectl exec -n vault -it vault-0 -- vault kv put internal/ecommerce/dev/mysql \
  MYSQL_ROOT_PASSWORD="root" MYSQL_USER="ecommerce" MYSQL_PASSWORD="ecommerce"

kubectl exec -n vault -it vault-0 -- vault kv put internal/ecommerce/dev/minio \
  MINIO_ACCESS_KEY="minioadmin" MINIO_SECRET_KEY="minioadmin"
```

Switch the chart to Vault-backed secrets:

```bash
helm upgrade ecommerce-dev deployment/helm/ecommerce \
  -f deployment/helm/ecommerce/values.yaml -f deployment/helm/ecommerce/values-dev.yaml \
  --set externalSecrets.auth=vault -n ecommerce-dev
```

**Validate:** `kubectl -n ecommerce-dev get externalsecret backend-secret` shows
`SecretSynced`/`True` with `vault-backend` as its store — then delete the
manually-created `aws-creds` Secret from the static-key setup and confirm
the stack still starts clean (the concrete proof this closes the "local dev
needs a real AWS credential" gap).

---

## 3. Falco

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm install falco falcosecurity/falco -n falco --create-namespace \
  -f deployment/platform/falco/values.yaml \
  --set-file customRules.rules-ecommerce\.yaml=deployment/platform/falco/rules-ecommerce.yaml

kubectl -n falco get pods --watch
kubectl -n falco expose svc falco-falcosidekick-ui --type=NodePort --target-port=2802 --name=falcosidekick-ui-np
```

**Validate:**

```bash
kubectl exec -it -n ecommerce-dev deploy/backend -- /bin/sh -c "echo triggered" || \
kubectl exec -it -n ecommerce-dev "$(kubectl get pod -n ecommerce-dev -l app=backend -o name | head -1)" -- sh
```

Open the Falcosidekick UI (`admin`/`admin`), confirm the "Unexpected shell in
ecommerce backend or frontend pod" alert appears within seconds, tagged with
the right namespace/pod.

---

## 4. Karpenter

**EKS only.** No `kind` equivalent exists — `kind` has no cloud
node-provisioning API for Karpenter to call against, so skip this section
entirely on local `kind` work.

```bash
# IAM role for the controller (IRSA) + the node instance profile role —
# eksctl manages both from one command, matching the ESO IRSA pattern
# already used in aws-eks-guide.md §6.
eksctl create iamserviceaccount \
  --cluster ecommerce --region us-east-1 \
  --namespace kube-system --name karpenter \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEKS_CNI_Policy \
  --role-only --role-name ecommerce-karpenter --approve

# Tag the subnets/security groups Karpenter should discover — matches
# nodepool.yaml's subnetSelectorTerms/securityGroupSelectorTerms.
aws ec2 create-tags --resources <subnet-ids...> --tags Key=karpenter.sh/discovery,Value=ecommerce
aws ec2 create-tags --resources <sg-id> --tags Key=karpenter.sh/discovery,Value=ecommerce

helm repo add karpenter oci://public.ecr.aws/karpenter/karpenter --version 1.0.0 2>/dev/null || true
helm install karpenter oci://public.ecr.aws/karpenter/karpenter -n kube-system \
  -f deployment/platform/karpenter/values.yaml \
  --set settings.clusterName=ecommerce \
  --set settings.interruptionQueue=ecommerce-karpenter

kubectl apply -f deployment/platform/karpenter/nodepool.yaml
```

**Validate:** scale the backend Rollout up beyond what the existing fixed
nodegroup (`aws-eks-guide.md` §1) can schedule —

```bash
kubectl -n ecommerce-stage scale rollout backend --replicas=10
kubectl get nodes --watch   # a new node should appear within ~1 minute
```

---

## 5. Litmus Chaos

```bash
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm
helm repo update
helm install chaos litmuschaos/litmus -n litmus --create-namespace \
  -f deployment/platform/litmus/values.yaml

kubectl -n litmus get pods --watch
kubectl -n litmus expose svc chaos-litmus-frontend-service --type=NodePort --target-port=8185 --name=chaos-frontend-np
```

Grant the experiments' service account permission to act in
`ecommerce-dev` (Litmus's install includes a `litmus-admin` ServiceAccount
per namespace it's authorized against — create/bind it in the target
namespace):

```bash
kubectl -n ecommerce-dev apply -f https://raw.githubusercontent.com/litmuschaos/litmus/master/litmus-portal/graphql-server/rbac/litmus-admin-rbac.yaml
```

Run the experiments, low-blast-radius ones first:

```bash
kubectl apply -f deployment/platform/litmus/experiments/pod-delete-backend.yaml
kubectl -n ecommerce-dev get chaosresult pod-delete-backend-pod-delete -w

kubectl apply -f deployment/platform/litmus/experiments/container-kill-backend.yaml
kubectl -n ecommerce-dev get chaosresult container-kill-backend-container-kill -w
```

**Validate:** watch Phase 1's Grafana dashboard while `pod-delete-backend`
runs — requests should dip briefly then recover as the Rollout replaces the
pod. Then run the dependency-failure experiment, expecting (and recording,
not "fixing before it's even understood") a real failure:

```bash
kubectl apply -f deployment/platform/litmus/experiments/dependency-failure-mysql.yaml
kubectl -n ecommerce-dev get chaosresult dependency-failure-mysql-pod-delete -w
```

A `Fail` verdict here is the expected, honest result — see the comment
block at the top of `dependency-failure-mysql.yaml` for what it's surfacing
and what the follow-up fix looks like.

---

## 6. K8sGPT

Setup is in `deployment/platform/k8sgpt/ollama-setup.md` — CLI + local
Ollama, no Helm release. Once installed:

```bash
k8sgpt integration activate prometheus -n monitoring
k8sgpt analyze -n ecommerce-dev -e -b ollama
```

**Validate:** deliberately break something first, then confirm K8sGPT
catches it —

```bash
helm upgrade ecommerce-dev deployment/helm/ecommerce \
  -f deployment/helm/ecommerce/values.yaml -f deployment/helm/ecommerce/values-dev.yaml \
  --set backend.resources.limits.memory=10Mi -n ecommerce-dev   # deliberately too low, will OOMKill

k8sgpt analyze -n ecommerce-dev -e -b ollama
# should identify the backend pod's CrashLoopBackOff/OOMKilled state and
# explain it in plain English

# revert:
helm upgrade ecommerce-dev deployment/helm/ecommerce \
  -f deployment/helm/ecommerce/values.yaml -f deployment/helm/ecommerce/values-dev.yaml \
  -n ecommerce-dev
```

---

## Teardown

```bash
helm uninstall chaos -n litmus && kubectl delete ns litmus
helm uninstall falco -n falco && kubectl delete ns falco
helm uninstall vault -n vault && kubectl delete ns vault
helm uninstall kube-prometheus-stack -n monitoring && kubectl delete ns monitoring
# Karpenter (EKS only): helm uninstall karpenter -n kube-system, then delete the NodePool/EC2NodeClass
# and the eksctl-created IAM role/instance profile.
```
