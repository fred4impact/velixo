# Electives Work Plan: Prometheus/Grafana, Vault, Falco, Karpenter, Litmus, K8sGPT

This is the build-out plan for Part 7 of `notes/devops-course-plan.md`
("Electives: Observability, Runtime Security, Chaos") — turning those six
tools from "topics in `class-note.md`" into working pieces of *this app's*
deployment stack, following the same convention already established by the
platform add-ons that exist today:

```
deployment/platform/<tool>/values*.yaml   — Helm value overrides, checked in
deployment/docs/kind-local-guide.md       — numbered install steps (kind)
deployment/docs/aws-eks-guide.md          — numbered install steps (EKS)
```

Each phase below ends with files added to `platform/`, install steps added
to both guides, and a validation check specific to this app (not "the pod is
Running" — "you can see the ecommerce backend's request rate on a
dashboard").

**Status: all six phases' files now exist** — `platform/prometheus-grafana/`,
`platform/vault/`, `platform/falco/`, `platform/karpenter/`,
`platform/litmus/`, `platform/k8sgpt/`, plus the app-side changes each
required (`backend/src/metrics` for Phase 1, the `vault` branch in
`helm/ecommerce/templates/secretstore.yaml` for Phase 2). Numbered install
steps for all six are in
[docs/electives-install-guide.md](../docs/electives-install-guide.md).

## Sequencing and why

```
Phase 1: Prometheus + Grafana   ─┐
                                  ├─ everything else either dashboards into
Phase 2: Vault                   │  Grafana or benefits from Prometheus
                                  │  already existing, so it goes first
Phase 3: Falco          (needs Phase 1's Grafana as its alert surface)
Phase 4: Karpenter      (independent — EKS only, no dependency on 1-3)
Phase 5: Litmus Chaos   (needs Phase 1 running, to observe blast radius
                          live instead of guessing whether an experiment
                          actually did anything)
Phase 6: K8sGPT         (needs Phase 1 for its Prometheus integration;
                          natural capstone — "diagnose everything above")
```

Vault and Karpenter can be built in parallel with each other and with Phase
3, since neither depends on or feeds into Falco/Litmus. Phase 1 is the one
hard prerequisite for everything except Karpenter.

---

## Phase 1 — Prometheus + Grafana

**Why this app specifically:** right now this app has zero runtime metrics.
Argo Rollouts' canary steps (`values-stage.yaml`/`values-prod.yaml`) pause
for 2–10 minutes on a *timer*, not on a real health signal — the honest gap
this phase closes is giving the canary something to actually watch.

**Real prerequisite this phase surfaces:** Prometheus can scrape
infrastructure metrics (CPU/RAM/pod count) with zero app changes, but *this
app's own business metrics* (orders placed, checkout failures, cart-add
rate) don't exist until the backend exposes a `/metrics` endpoint. That's a
backend code change, not just a platform install:

- `backend/src/metrics/` — new module using `prom-client` (or
  `@willsoto/nestjs-prometheus`), exposing `GET /metrics`, with counters for
  orders created, checkout failures by reason, and a histogram for request
  duration per route.
- `frontend` gets metrics for free via the Next.js server's default Node.js
  process metrics (no custom instrumentation needed for phase 1 — page-level
  RUM metrics would be a stretch goal, not required).

**Files to add:**
- `platform/prometheus-grafana/values-prometheus.yaml` — scrape interval,
  retention, `serviceMonitorSelectorNilUsesHelmValues=false` (so it picks up
  ServiceMonitors outside its own release, matching the notes)
- `platform/prometheus-grafana/values-grafana.yaml` — datasource
  pre-provisioned pointing at `http://prometheus-server`, NodePort per
  environment (`kind`: 30000/30100 convention already used by ingress-nginx;
  EKS: behind the existing ingress-nginx + cert-manager stack instead of a
  raw NodePort, matching how the app itself is exposed)
- `helm/ecommerce/templates/servicemonitor.yaml` — **new**, gated behind a
  `monitoring.enabled` flag in `values.yaml` (matching the existing
  `devServices.enabled` / `externalSecrets.auth` flag pattern) — this is the
  piece that actually tells Prometheus to scrape `backend`'s new `/metrics`
  route, and belongs in the *app's* chart, not the platform folder, since
  it's specific to this app's own Service.

**Dashboards:** Node.js dashboard (Grafana.com id `11159` or `12230`, same
ones the source notes reference) for both backend/frontend process metrics,
plus one hand-built dashboard for the new business counters (orders/min,
checkout failure rate) — this second one is the artifact that makes the
canary pause meaningful later, not decorative.

**Validation:** place an order through the storefront, watch the "orders
created" counter move on the dashboard within one scrape interval.

---

## Phase 2 — Vault

**Why this app specifically, and how it avoids duplicating what's already
built:** this app already has External Secrets Operator wired to AWS
Secrets Manager for *every* environment (`helm/ecommerce/templates/
secretstore.yaml`) — `stage`/`prod` authenticate via IRSA, `dev` (on `kind`)
authenticates via a static IAM access key, because `kind` has no OIDC
federation with AWS. That static-key requirement is the one weak point:
local dev depends on a real AWS credential existing on the laptop just to
start the stack. Vault fixes exactly that gap — it doesn't replace ESO+AWS
Secrets Manager for `stage`/`prod` (no reason to; IRSA is already the right
answer there), it gives **`dev` a real secrets backend with no AWS
dependency at all**.

**Files to add:**
- `platform/vault/values.yaml` — `server.dev.enabled=true` for `kind` only
  (in-memory, unsealed automatically — matches the notes; a production Vault
  HA setup is explicitly out of scope, this is a dev-environment secrets
  backend, not a stage/prod one)
- `helm/ecommerce/templates/secretstore.yaml` — extend the existing
  `{{- if eq .Values.externalSecrets.auth "irsa" }}` / static-key branching
  with a third option, `vault`, adding a `SecretStore` with
  `spec.provider.vault` instead of `spec.provider.aws`, selected when
  `values-dev.yaml` sets `externalSecrets.auth: vault`
- `platform/vault/dev-policy.hcl` — read-only policy scoped to
  `internal/data/ecommerce/dev/*`, matching the path convention the AWS
  Secrets Manager version already uses (`ecommerce/dev/backend`)
- `platform/vault/k8s-auth-role.yaml` — `vault write auth/kubernetes/role/…`
  equivalent, bound to the backend's ServiceAccount + `ecommerce-dev`
  namespace only

**Validation:** delete the manually-created static AWS credential Secret
from `docs/kind-local-guide.md`'s current dev setup, confirm the stack still
starts clean with secrets flowing from Vault instead — the concrete proof
this closes the gap it's meant to close.

---

## Phase 3 — Falco

**Why this app specifically:** the backend handles file uploads (product
images to MinIO) and runs arbitrary `npm` dependencies — a plausible
container-escape or reverse-shell scenario is someone popping a shell inside
the `backend` pod. Falco's default ruleset already catches "shell spawned in
container"; the value-add here is narrowing that from cluster-wide noise
down to *this app's* namespaces specifically.

**Files to add:**
- `platform/falco/values.yaml` — `falcosidekick.enabled=true`,
  `falcosidekick.webui.enabled=true`, `driver.kind=ebpf` (works on both
  `kind` and EKS without needing kernel module compilation)
- `platform/falco/rules-ecommerce.yaml` — a custom rule file, one rule:
  "Unexpected shell in ecommerce backend/frontend pod" scoped by namespace
  (`ecommerce-dev`/`ecommerce-stage`/`ecommerce-prod`) and container image
  name, tighter than Falco's stock "Terminal shell in container" rule which
  fires on every namespace including Falco's own DaemonSet

**Deliberately out of scope for this phase:** routing alerts into Loki (the
notes do this, but Loki/Grafana Alloy weren't part of this elective list —
Falcosidekick's own bundled Web UI is enough alert surface for phase 3; wiring
Loki in later is a two-line values change if it's ever wanted, not a
redesign).

**Validation:** `kubectl exec -it` into the `backend` pod, confirm the alert
appears in the Falcosidekick UI within seconds, tagged with the right
namespace/pod.

---

## Phase 4 — Karpenter

**EKS only** — `kind` has no cloud-provider node-provisioning API for
Karpenter to call, so this phase has no `kind` equivalent (call this out
explicitly in `kind-local-guide.md` rather than silently skipping it).

**Why this app specifically:** `docs/aws-eks-guide.md` currently provisions
a single fixed-size nodegroup (`eksctl create nodegroup --name standard`,
no autoscaling at all). That means a canary rollout doubling replica count
mid-rollout, or a Litmus chaos experiment (Phase 5) draining a node, has
nowhere to schedule new pods. This phase is what makes Phases 1's canary
pauses and Phase 5's node-drain experiments actually survivable instead of
just pending-forever.

**Files to add:**
- `platform/karpenter/values.yaml` — controller install values
- `platform/karpenter/nodepool.yaml` — a `NodePool` + `EC2NodeClass` pair
  scoped to this app: instance types sized from the same capacity numbers
  already worked out in `notes/devops-course-plan.md`'s Part 4 (backend
  ~2GB/1CPU, frontend ~1GB/0.5CPU per replica), spot-eligible for
  `stage`, on-demand-only for `prod`

**Validation:** scale the backend Rollout's replica count up manually,
watch Karpenter provision a new node within ~1 minute without a pre-existing
nodegroup slot for it.

---

## Phase 5 — Litmus Chaos

**Why this app specifically, and the one real adaptation needed:** the
source notes' chaos experiments target `App kind = deployment` — this app's
backend/frontend are **Argo Rollouts**, not plain Deployments (see
`strategy.md`). Pod-delete and container-kill experiments work fine against
a Rollout's pods via label selector (`app: backend` / `app: frontend`), but
the experiment YAML needs `App kind = rollout` or a label-only selector,
not `deployment` verbatim — this is a real gotcha the notes' example would
fail on unmodified, worth calling out to students explicitly rather than
letting them hit it themselves.

**Files to add:**
- `platform/litmus/values.yaml`
- `platform/litmus/experiments/pod-delete-backend.yaml`,
  `container-kill-backend.yaml` — low-blast-radius, feature-branch-safe
  experiments, targeting the backend Rollout's pods
- `platform/litmus/experiments/dependency-failure-mysql.yaml` — simulates
  the MySQL pod being unavailable for ~30s; this app's backend has no
  connection-retry/circuit-breaker logic today, so the expected (honest)
  result of this experiment on first run is **failure** — checkout requests
  500 instead of degrading gracefully. That's the point of running it: it's
  a chaos experiment surfacing a real gap, not a rubber-stamp pass.
- `platform/litmus/probes/backend-health.yaml` — HTTP probe against
  `/health` (the endpoint already exists — see `backend/src/app.
  controller.ts`), used as the experiment's steady-state hypothesis

**Validation:** run `pod-delete-backend`, confirm (via Phase 1's dashboard)
requests dip briefly then recover as the Rollout replaces the pod; run
`dependency-failure-mysql`, document the checkout-500 result as a tracked
follow-up (add basic retry logic to the Prisma connection) rather than
treating the experiment as "done" once it merely completes.

---

## Phase 6 — K8sGPT

**Why this app specifically, and why it's last:** K8sGPT is a diagnostic
layer over everything built in Phases 1–5 — it's most useful once there's
something to diagnose (a misconfigured `NodePool`, a Falco-flagged pod, a
Rollout stuck mid-canary). Building it first would just be `k8sgpt analyze`
against an empty, healthy cluster with nothing to say.

**Files to add:**
- `platform/k8sgpt/values.yaml` (or a plain install doc, since the notes'
  setup is CLI + Ollama, not a Helm release)
- `platform/k8sgpt/ollama-setup.md` — steps to run Ollama + pull a model,
  scoped to whichever node runs the K8sGPT CLI (build server for CI-time
  diagnostics, or a student's own machine for local `kind` work)
- integration step: `k8sgpt integration activate prometheus -n monitoring`,
  wiring it to Phase 1's Prometheus so `k8sgpt analyze --filter
  PrometheusConfigValidate` has something real to check

**Validation:** deliberately misconfigure something (e.g. a bad
`resources.limits` value in `values-dev.yaml`, or leave a Falco rule
syntactically broken from Phase 3), run `k8sgpt analyze -n ecommerce-dev -e
-b ollama`, confirm it identifies the injected fault in plain English.

---

## What "done" looks like for this work plan

Each phase is complete when:
1. Its `platform/<tool>/` files exist and are referenced by both
   `kind-local-guide.md` and `aws-eks-guide.md` (or explicitly marked
   EKS-only, per Phase 4).
2. The phase's own **Validation** step above has actually been run against
   a live cluster, not just "the Helm chart installed cleanly."
3. `strategy.md`'s architecture diagram is updated to include the new
   component, keeping it the single source of truth for what's actually
   running — it currently reflects only the pre-electives state.

Phases 1 and 2 are the two with no dependencies blocking a start — either is
a reasonable next phase to actually build.
