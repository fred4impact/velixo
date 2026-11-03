# Deployment Strategy

GitOps deployment of the e-commerce backend (NestJS) and frontend (Next.js) via
**ArgoCD** + **Argo Rollouts**, across three environments, on two cluster
targets:

| Environment | Cluster | Namespace | Purpose |
|---|---|---|---|
| `dev` | local `kind` | `ecommerce-dev` | Inner dev loop, mirrors `docker-compose.yml` |
| `stage` | AWS EKS | `ecommerce-stage` | Pre-prod validation, real AWS services |
| `prod` | AWS EKS | `ecommerce-prod` | Production |

Two independent ArgoCD installs: one on `kind` (manages only `dev`), one on
EKS (manages `stage` + `prod` via an `ApplicationSet`). They are intentionally
not one ArgoCD spanning both clusters — local dev shouldn't depend on AWS
being reachable to sync.

See [docs/kind-local-guide.md](docs/kind-local-guide.md) and
[docs/aws-eks-guide.md](docs/aws-eks-guide.md) for step-by-step instructions.

## Architecture

```
                     ┌─────────────────────┐
                     │   Git repo (this)    │
                     │  deployment/helm/     │
                     │  ecommerce (+ values- │
                     │  <env>.yaml)          │
                     └──────────┬───────────┘
                                │ watched by
              ┌─────────────────┴─────────────────┐
              ▼                                     ▼
     ArgoCD (on kind)                       ArgoCD (on EKS)
     Application: dev                       ApplicationSet: [stage, prod]
              │                                     │
              ▼                                     ▼
     ┌─────────────────┐                 ┌─────────────────────────┐
     │  kind cluster     │                 │        EKS cluster       │
     │  ns: ecommerce-dev│                 │ ns: ecommerce-stage/prod │
     │                    │                 │                          │
     │  Argo Rollout      │                 │  Argo Rollout (canary)   │
     │   backend/frontend │                 │   backend/frontend       │
     │  in-cluster MySQL  │                 │  RDS MySQL (real)        │
     │  in-cluster MinIO  │                 │  S3 (real)               │
     │  in-cluster Mailpit│                 │  Real SMTP (Resend/SES)  │
     │  ESO (static creds)│                 │  ESO (IRSA)              │
     └────────────────────┘                 └──────────────────────────┘
              │                                     │
              ▼                                     ▼
     AWS Secrets Manager                   AWS Secrets Manager
     ecommerce/dev/*                       ecommerce/stage/*, ecommerce/prod/*
```

## Why these choices

- **ArgoCD + ApplicationSet**: `stage` and `prod` are structurally identical
  (same manifests, different values) — a `list` generator ApplicationSet
  templates one `Application` per environment instead of hand-maintaining
  two nearly-identical `Application` YAMLs.
- **Argo Rollouts (canary)**: replaces the backend/frontend `Deployment` with
  a `Rollout` object. Steps shift traffic 20% → 50% → 100% with a **manual**
  pause at each step (`kubectl argo rollouts promote`) — there's no metrics
  stack (Prometheus) yet to gate promotion automatically. Swapping in an
  `AnalysisTemplate` later to automate this is a small, additive change once
  metrics exist.
- **External Secrets Operator + AWS Secrets Manager**: nothing secret is ever
  committed to git. `stage`/`prod` authenticate via IRSA (no credentials
  anywhere). `dev` on `kind` has no OIDC federation available, so it's the
  one place a static IAM user's access key is used — created manually,
  out-of-band, documented in the kind guide, never committed.
- **Helm for the app itself**: one chart (`helm/ecommerce/`), one
  `values.yaml` (shaped for dev) plus a thin `values-<env>.yaml` override
  per environment. ArgoCD's `Application`/`ApplicationSet` `source.helm`
  points at the chart and the right values file per environment. Platform
  *add-ons* (ArgoCD, Argo Rollouts, cert-manager, ESO, ingress-nginx) are
  also installed via their own upstream Helm charts — that's the standard
  distribution mechanism for those projects.
  - `deployment/overlays/` (Kustomize) still exists in this repo as a
    **reference** — it was the first pass at this and is kept because it's a
    perfectly valid alternative reading of the same manifests, but **ArgoCD
    does not deploy it**. If it drifts from the Helm chart over time, trust
    the Helm chart; the Kustomize tree isn't kept in sync automatically.

## Known tradeoff: frontend images are per-environment

Next.js inlines `NEXT_PUBLIC_*` env vars into the JS bundle **at build
time**, not runtime. `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` differ per environment, so unlike the
backend (which reads all config from env vars at container start — one image
promotes unchanged from dev → stage → prod), **the frontend image is built
once per environment** in CI, each with its own tag
(`frontend:<sha>-stage`, `frontend:<sha>-prod`). This is a deliberate,
documented tradeoff, not an oversight — the alternative (a runtime env-var
injection shim rewriting `window.__ENV__`) is a real frontend code change,
out of scope here.

## Config vs. secrets

- **ConfigMap** (`helm/ecommerce/templates/backend/configmap.yaml`,
  rendered from `.Values.backend.config`): non-secret values —
  `FLAT_TAX_RATE`, `FLAT_SHIPPING_RATE`, bucket/region hostnames,
  `FRONTEND_URL`. Set per environment directly in `values-<env>.yaml`.
- **ExternalSecret** (`helm/ecommerce/templates/backend/externalsecret.yaml`):
  pulls one JSON secret per environment from AWS Secrets Manager, keyed by
  `.Values.backend.externalSecret.secretsManagerKey`
  (`ecommerce/<env>/backend`), and explodes it into a K8s `Secret` whose keys
  match the env var names the app already reads (`DATABASE_URL`,
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` — the latter
  pair being S3 credentials in stage/prod, MinIO root creds in dev). **Zero
  backend code changes required** — it already reads these as plain env
  vars.

## Rollout & rollback

```bash
# watch a rollout in progress
kubectl argo rollouts get rollout backend -n ecommerce-stage --watch

# promote past the current pause
kubectl argo rollouts promote backend -n ecommerce-stage

# abort and roll back to the last stable revision
kubectl argo rollouts undo backend -n ecommerce-stage
```

## Directory layout

```
deployment/
├── strategy.md                  # this file
├── helm/ecommerce/              # ★ the deployed artifact — ArgoCD sources this
│   ├── Chart.yaml
│   ├── values.yaml               # defaults, shaped for dev
│   ├── values-dev.yaml
│   ├── values-stage.yaml
│   ├── values-prod.yaml
│   └── templates/
│       ├── backend/              # Rollout, Service, ServiceAccount, ConfigMap,
│       │                          #   ExternalSecret, HPA
│       ├── frontend/              # same shape, no ExternalSecret
│       ├── devservices/           # mysql/minio/mailpit — only rendered when
│       │                          #   devServices.enabled (dev only)
│       ├── ingress.yaml
│       └── secretstore.yaml       # switches static-creds vs IRSA auth
├── overlays/ + base/             # Kustomize — reference only, NOT deployed
│                                  #   by ArgoCD (see "Why these choices")
├── argocd/
│   ├── projects/                # AppProject
│   ├── application-dev.yaml     # single Application -> kind, Helm source
│   └── applicationset-eks.yaml  # list generator [stage, prod] -> EKS, Helm source
├── platform/                    # add-on Helm values (installed before the app)
│   ├── argo-rollouts/
│   ├── ingress-nginx/
│   ├── cert-manager/            # EKS only
│   └── external-secrets/
└── docs/
    ├── kind-local-guide.md
    └── aws-eks-guide.md
```
