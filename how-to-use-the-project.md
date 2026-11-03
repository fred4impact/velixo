# How to Use This Project

This repo is more than the app — it's the app plus a full DevSecOps toolchain
around it (CI, GitOps deployment, automated tests, observability/security
electives). This doc is the entry point: pick a path below, get the
prerequisite checklist for it, and follow the linked guide for exact
commands. Detailed commands live in the linked docs, not duplicated here —
this file's job is routing, not repetition.

## What's actually in this repo

```
ecommerce/                     this repo
├── backend/, frontend/         the app itself (NestJS + Next.js)
├── docker-compose.yml           local, no Kubernetes — fastest path
├── deployment/                  Kubernetes/GitOps/CI — see §2 below
│   ├── helm/ecommerce/           the Helm chart ArgoCD actually deploys
│   ├── argocd/                   Application/ApplicationSet/AppProject
│   ├── platform/                 add-ons: ingress-nginx, cert-manager,
│   │                              external-secrets, argo-rollouts, and the
│   │                              six electives (prometheus-grafana, vault,
│   │                              falco, karpenter, litmus, k8sgpt)
│   ├── docs/                     kind-local-guide.md, aws-eks-guide.md,
│   │                              electives-install-guide.md
│   ├── strategy.md               the deployment architecture, explained
│   ├── devsecops-pipeline.md     CI pipeline design (GitHub Actions)
│   └── gitlab-ci.yml             the same pipeline, for GitLab instead
├── .github/workflows/security-scan.yml  npm audit + Trivy on backend & frontend (the only active workflow)
└── README.md                     app-level docs: local run, full API reference

robotic-tests/                 sibling repo — Robot Framework + Playwright
                                 test suite (API + UI), 70 tests

notes/devops-course-plan.md    this whole project, repackaged as a course
```

## 1. Pick your path

| I want to... | Path | Prerequisites (§3) | Guide |
|---|---|---|---|
| See the app running, fastest | **A. Docker Compose** | Docker Desktop only | `README.md` |
| Learn/practice GitOps (ArgoCD, Helm, Argo Rollouts) without any cloud cost | **B. Local `kind`** | Docker Desktop + 5 CLIs | `deployment/docs/kind-local-guide.md` |
| Deploy for real, on AWS | **C. AWS EKS (stage/prod)** | AWS account + 5 CLIs + a domain | `deployment/docs/aws-eks-guide.md` |
| Run the automated test suite against any of the above | **D. Robot Framework** | Python 3 | `robotic-tests/how-to-run.md` |
| Add monitoring/secrets/runtime-security/autoscaling/chaos-testing/AIOps on top of B or C | **E. Electives** | Path B or C already running | `deployment/docs/electives-install-guide.md` |

These aren't mutually exclusive — B and C both exist because B is the free,
fast inner-dev-loop and C is where it actually runs for real; D tests
whichever is currently up; E is optional depth on top of B or C, not a
separate deployment target.

## 2. What's deployed where

The single fact that explains most of this repo's structure: **the same
Helm chart deploys to all three environments** (`deployment/helm/ecommerce`),
with `values.yaml` (dev defaults) and `values-{stage,prod}.yaml` swapping out
what differs — nothing is a separate codebase per environment.

| Component | A. Docker Compose | B. `kind` (dev) | C. EKS (stage/prod) |
|---|---|---|---|
| Backend/Frontend | containers | Argo Rollout (canary) | Argo Rollout (canary, longer pauses in prod) |
| MySQL | container | in-cluster StatefulSet | RDS |
| File storage | MinIO container | in-cluster MinIO | S3 |
| Email | Mailpit container | in-cluster Mailpit | real SMTP — **not wired up yet, see gap below** |
| Payments | Stripe test mode | Stripe test mode | Stripe test/live mode |
| Secrets | plain `.env` file | AWS Secrets Manager (static IAM key) *or* Vault (Electives §2) | AWS Secrets Manager (IRSA) |
| GitOps controller | none — you run `docker compose` directly | ArgoCD (on `kind`, manages only `dev`) | ArgoCD (on EKS, manages `stage`+`prod` via ApplicationSet) |
| Ingress | published ports (`:3000`/`:4000`) | ingress-nginx, `*.127.0.0.1.nip.io` | ingress-nginx + cert-manager, real domain |
| CI trigger | none | `.github/workflows/deploy.yml`, on push to `main` | same workflow, `promote_sha` via `workflow_dispatch` for prod |

**Known gap, flagged rather than silently glossed over:** `values-stage.yaml`
doesn't override `backend.config.SMTP_HOST`/`SMTP_PORT`, so stage currently
inherits dev's `mailpit` default even though `devServices.enabled: false`
means no Mailpit is actually deployed there — email sending will fail
silently on stage until a real SMTP provider (Resend/SES) is configured in
`values-stage.yaml`/`values-prod.yaml`.

## 3. Prerequisites checklist

| Tool | Needed for | Notes |
|---|---|---|
| Docker Desktop | A, B | B also needs it for `kind` itself (a `kind` cluster *is* Docker containers) |
| `kind` | B | |
| `kubectl` | B, C | |
| `helm` | B, C | |
| `argocd` CLI | B, C | optional — `kubectl` alone can inspect `Application` resources |
| `aws` CLI | B (Secrets Manager only), C (everything) | B's AWS usage is minimal unless you also do Electives §2 (Vault removes even that) |
| `eksctl` | C | |
| A domain you control | C | for real ingress hosts + cert-manager's HTTP01 challenge; B uses `nip.io`, no domain needed |
| Python 3.11+ | D | |
| Node.js | *not required on your host* | both `backend/` and `frontend/` run inside containers/pods everywhere — you never need Node installed locally to use this project, only to develop it |

## 4. End-to-end order of operations

If you're setting this up from zero and want the full picture, not just one
path:

1. **App first** — `docker compose up`, confirm it works (`README.md`). This
   is also what Robot Framework tests against by default.
2. **Tests** — `robotic-tests/`, run the suite against the compose stack
   (`robotic-tests/how-to-run.md`). Establishes a working baseline before
   anything Kubernetes-shaped enters the picture.
3. **CI** — `deployment/devsecops-pipeline.md` describes the intended
   lint/test/SCA/SAST/scan/smoke-test gate as `backend-ci.yml`/
   `frontend-ci.yml`; **these two files don't exist yet** — only
   `.github/workflows/security-scan.yml` (npm audit + Trivy) is active today;
   the AWS push-to-registry-and-bump-tag half (`deploy.yml`) was removed for
   now and can be restored from commit `7ef1ebc`. Building the PR-gate half is the natural next step here,
   using the design doc as the spec. `deployment/gitlab-ci.yml` is the
   equivalent for GitLab instead, already written as a real file.
4. **Local Kubernetes** — `deployment/docs/kind-local-guide.md`, get `dev`
   running via ArgoCD on `kind`. This is where `strategy.md`'s architecture
   stops being a diagram and starts being something you can `kubectl get
   pods` against.
5. **Cloud** — `deployment/docs/aws-eks-guide.md`, provision EKS + RDS + S3,
   get `stage` (and later `prod`) running via the same Helm chart.
6. **Electives** — `deployment/docs/electives-install-guide.md`, layered on
   top of step 4 or 5: Prometheus/Grafana first (most of the rest either
   dashboards into it or benefits from it existing), then Vault, Falco,
   Karpenter (EKS only), Litmus, K8sGPT in the order explained in
   `deployment/platform/electives-work-plan.md`.

Steps 1–2 take minutes. Step 3 (finishing the CI build) is a few hours.
Steps 4–6 are each their own session — none of them are a "run one command
and walk away" exercise, and the guides say so up front in their own
Prerequisites sections.

## 5. Full doc index

| Doc | Covers |
|---|---|
| `README.md` | App itself: local run, seeded credentials, full API route reference |
| `spec.md` | Original build spec the app was implemented from |
| `deployment/strategy.md` | Deployment architecture: why Helm not Kustomize, why two ArgoCDs, why Argo Rollouts |
| `deployment/devsecops-pipeline.md` | CI pipeline design + Jenkins/GitHub Actions/GitLab CI comparison |
| `deployment/gitlab-ci.yml` | The CI pipeline, as a real GitLab CI file |
| `.github/workflows/security-scan.yml` | Dependency audit + secret/misconfig scanning for backend and frontend |
| `deployment/docs/kind-local-guide.md` | Local Kubernetes, step by step |
| `deployment/docs/aws-eks-guide.md` | Cloud Kubernetes, step by step |
| `deployment/docs/electives-install-guide.md` | Prometheus/Grafana, Vault, Falco, Karpenter, Litmus, K8sGPT — step by step |
| `deployment/platform/electives-work-plan.md` | Why those six, in that order, and what "done" means for each |
| `robotic-tests/README.md`, `robotic-tests/how-to-run.md` | Test suite setup, structure, and how to run it (manual + CI) |
| `notes/devops-course-plan.md` | This entire project, restructured as a teachable course |
