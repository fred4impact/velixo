# DevSecOps CI Pipeline — Backend + Frontend

This is the CI companion to [strategy.md](strategy.md). `strategy.md` covers
how a built image *gets deployed* (ArgoCD/Helm/Argo Rollouts, already built).
This document covers how a `git push` *becomes* that built image — adapted
from `../../notes/class-note.md` (a set of class notes for an unrelated
Springboot+Node.js/Jenkins project) to this repo's actual stack.

## 1. What's reusable from the class notes, and what isn't

The notes contain two Jenkins pipeline templates: one for a **Springboot**
backend (Maven-based), one for a **Node.js** frontend (npm-based), each with
a "feature branch" (full gate) and "main branch" (light gate) variant, plus a
separate "Deployment Pipeline" job triggered at the end.

This app's backend is **NestJS**, not Springboot — so the Maven/Springboot
template doesn't apply to either service here. Both `backend/` and
`frontend/` are npm projects, so the **Node.js template is the right base for
both**, just parameterized differently (Prisma generate for the backend,
`NEXT_PUBLIC_*` build args for the frontend).

Two things from the notes are deliberately **not** carried over:

- **A dedicated Jenkins master + build server + SonarQube server (3 always-on
  EC2 boxes, per the notes' capacity section).** This project has no such
  infra running today, and standing it up (provisioning, patching, capacity
  planning) is disproportionate to what a single-app pipeline needs — see §4.
- **The "Deployment Pipeline" Jenkins job, triggered at the end with cluster
  credentials.** The notes call this out themselves as a known problem
  ("Traditional CICD Challenges: Jenkins can access Production cluster").
  This repo already solves it the way the notes' own later sections point
  toward (ArgoCD/GitOps): CI never touches a cluster. It only bumps an image
  tag in `deployment/helm/ecommerce/values-<env>.yaml` and pushes; ArgoCD
  (already configured, watching this repo) reconciles the rest. That's why
  `values-stage.yaml` / `values-prod.yaml` already carry `# CI overwrites
  this tag` comments — this doc is what fills that in.

## 2. Stage mapping (notes → this repo)

| Notes' Node.js pipeline stage | Notes' tool | This repo | Why |
|---|---|---|---|
| Checkout | Jenkins `git` step | `actions/checkout` | — |
| Build-UnitTest | `npm test` | `npm run lint` + `npm test` | backend has Jest configured; frontend has none yet — see §6 gap |
| OWASP (SCA) | OWASP Dependency-Check plugin | `npm audit --omit=dev` (or the Dependency-Check GitHub Action if a false-positive-tuned SCA is wanted later) | zero infra, runs in the same job |
| SonarQube Analysis + Quality Gate | self-hosted SonarQube server | **SonarCloud** (SaaS, free for this project size) | keeps the exact SonarQube quality-gate concept, drops the server to patch/monitor |
| Build Image | `docker.build()` | `docker build` (multi-stage `Dockerfile`, already exists per service) | — |
| Scan Image | Trivy + Hadolint | same: `aquasecurity/trivy-action`, `hadolint/hadolint-action` | both ship as ready-made GitHub Actions, no server |
| Smoke Deploy + Smoke Test | `kind` + `kubectl wait` | `docker compose up` with the freshly built images + the **Robot Framework suite** (`robotic-tests/`, already built) | this repo already has a working functional-test suite; reusing it is more coverage than a bare `kubectl wait` for pod-ready, for less setup than provisioning `kind` in CI |
| Trigger CD | Jenkins job w/ Gitlab password param | commit bumping `backend.image.tag` / `frontend.image.tag` in `values-<env>.yaml`, pushed to this repo | ArgoCD already watches this path (see `strategy.md` architecture diagram) — ArgoCD, not CI, applies it to a cluster |

## 3. Branch model

Mirrors the notes' feature-branch (full gate) vs main-branch (light gate)
split, adapted to a GitOps promotion flow across the three environments
`strategy.md` already defines (`dev` on `kind`, `stage`/`prod` on EKS):

```
PR opened/updated  →  backend-ci.yml / frontend-ci.yml (whichever paths changed)
                       Checkout → Install → Lint → Unit test → SCA → SAST/Quality Gate
                       → Build image → Scan image (Trivy + Hadolint)
                       → docker compose smoke deploy → Robot suite (tests/api/, fast subset)
                       (no push, no GitOps commit — PRs never deploy anything)

Merge to main       →  same pipeline, plus on success:
                       → Push image to registry, tag = git SHA (+ ":dev" moving tag)
                       → Bump values-dev.yaml, commit, push
                       → ArgoCD (kind) auto-syncs dev
                       → full Robot suite (tests/) runs against dev as a post-deploy gate

Promote to stage    →  promote.yml, manually triggered (workflow_dispatch),
                       input = the git SHA tag already built+scanned+deployed to dev
                       → bump values-stage.yaml to that exact tag, commit, push
                       → ArgoCD (EKS) auto-syncs stage via canary (Argo Rollouts)

Promote to prod      →  same promote.yml targeting values-prod.yaml, gated by
                       a GitHub Environment with required reviewers (the
                       notes' CAB/change-window approval, as a native GH
                       Environment protection rule instead of a manual process)
```

The key GitOps rule the notes' own "Traditional CICD Challenges" section
argues for: **the exact image tag validated in dev is the one promoted to
stage, and the exact tag validated in stage is the one promoted to prod** —
`promote.yml` only ever copies a tag string between `values-*.yaml` files, it
never rebuilds.

## 4. CI tool: Jenkins vs GitHub Actions vs GitLab CI

| | Jenkins | GitLab CI | **GitHub Actions** |
|---|---|---|---|
| Infra to run/patch/monitor | 3+ always-on servers (master, build node, SonarQube — per the notes' own capacity section) | none (SaaS runners) | none (SaaS runners) |
| Fits a GitOps CD split (CI never touches the cluster) | yes, but needs deliberate discipline — notes' own template *does* have Jenkins deploy to `kind` directly | yes | yes |
| Native container registry | needs ECR/Docker Hub wired in separately | GitLab Container Registry built in | GHCR built in, zero setup, uses the same `GITHUB_TOKEN` |
| AWS auth (for stage/prod on EKS) | static IAM keys as Jenkins credentials (as in the notes) | static keys or OIDC | **OIDC** (`aws-actions/configure-aws-credentials`) — no long-lived AWS keys stored anywhere |
| SAST/SCA without standing up a server | needs SonarQube + OWASP Dependency-Check servers/plugins | GitLab Ultimate tier bundles SAST/dependency scanning | SonarCloud (free tier) + `npm audit`, both SaaS |
| Matches this repo's current state | repo isn't hosted on any of these yet (`ecommerce/` isn't even a git repo yet — see §6) | — | — |
| Operational cost for a project this size | highest (servers to keep patched even when nobody's pushing code) | low | lowest |

**Recommendation: GitHub Actions**, with a full GitLab CI equivalent kept at
[gitlab-ci.yml](gitlab-ci.yml) in case this repo ends up hosted on GitLab
instead — same stages, same tools, ported job-for-job. For a project at this scale — one repo,
two services, no existing 24/7 CI infra, GitOps CD already built — the
deciding factors are (a) zero servers to provision or patch, (b) OIDC to AWS
instead of static keys sitting in credential storage, and (c) GHCR requiring
no setup beyond the workflow file itself. GitLab CI would be an equally
reasonable #2 if this project were hosted on GitLab instead of GitHub — the
pipeline design in this doc ports over almost unchanged (`.gitlab-ci.yml`
stages instead of workflow jobs, GitLab Container Registry instead of GHCR).
Jenkins is the wrong fit *for this project's current scale*: the notes'
own numbers (1 build job ≈ 1 CPU/2GB RAM/5GB HDD, 3 build servers to run
10-12 pipelines for 2 microservices) describe infrastructure sized for a team
running many pipelines continuously — worth it once there's an existing
on-prem/regulated environment or SaaS CI minutes stop being sufficient,
neither of which applies here yet.

## 5. Pipeline files

### `.github/workflows/backend-ci.yml`

```yaml
name: backend-ci

on:
  pull_request:
    paths: ["backend/**"]
  push:
    branches: [main]
    paths: ["backend/**"]

defaults:
  run:
    working-directory: backend

jobs:
  build-test-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: write   # only needed on the main-branch job below, split if preferred
      id-token: write    # for future OIDC use
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npm run lint
      - run: npm test -- --ci
      - run: npx prisma generate
      - run: npm run build

      - name: SCA — npm audit
        run: npm audit --omit=dev --audit-level=high

      - name: SAST — SonarCloud
        uses: SonarSource/sonarqube-scan-action@v3
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          projectBaseDir: backend

      - name: Build image
        run: docker build -t ecommerce-backend:${{ github.sha }} .

      - name: Lint Dockerfile
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: backend/Dockerfile

      - name: Scan image — Trivy
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ecommerce-backend:${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: "1"

      - name: Smoke deploy + Robot Framework smoke test
        run: |
          docker tag ecommerce-backend:${{ github.sha }} ecommerce-backend:dev
          # frontend image reused from cache/build-cache on main-branch runs;
          # PRs that only touch backend/ build backend fresh and pull the last
          # published frontend:dev image for compose
          docker compose -f docker-compose.yml up -d
          timeout 120 bash -c 'until curl -sf http://localhost:4000/health; do sleep 2; done'
          cd ../robotic-tests
          python -m venv .venv && source .venv/bin/activate
          pip install -r requirements.txt
          rfbrowser init chromium --skip-browsers
          robot --outputdir output tests/api/
          cd ../backend && docker compose down -v

      - name: Push image + bump dev tag (main only)
        if: github.ref == 'refs/heads/main'
        run: |
          echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker tag ecommerce-backend:${{ github.sha }} ghcr.io/${{ github.repository_owner }}/ecommerce-backend:${{ github.sha }}
          docker tag ecommerce-backend:${{ github.sha }} ghcr.io/${{ github.repository_owner }}/ecommerce-backend:dev
          docker push ghcr.io/${{ github.repository_owner }}/ecommerce-backend:${{ github.sha }}
          docker push ghcr.io/${{ github.repository_owner }}/ecommerce-backend:dev
          yq -i '.backend.image.repository = "ghcr.io/${{ github.repository_owner }}/ecommerce-backend" | .backend.image.tag = "${{ github.sha }}"' \
            ../deployment/helm/ecommerce/values-dev.yaml
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add ../deployment/helm/ecommerce/values-dev.yaml
          git commit -m "deploy(backend): dev -> ${{ github.sha }}"
          git push
```

### `.github/workflows/frontend-ci.yml`

Same shape, service-specific differences only:

```yaml
name: frontend-ci

on:
  pull_request:
    paths: ["frontend/**"]
  push:
    branches: [main]
    paths: ["frontend/**"]

defaults:
  run:
    working-directory: frontend

jobs:
  build-test-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
      - run: npm run lint
      # no `npm test` yet — see §6

      - name: SCA — npm audit
        run: npm audit --omit=dev --audit-level=high

      - name: SAST — SonarCloud
        uses: SonarSource/sonarqube-scan-action@v3
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          projectBaseDir: frontend

      - name: Build image
        run: |
          docker build \
            --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 \
            --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${{ secrets.STRIPE_TEST_PUBLISHABLE_KEY }} \
            -t ecommerce-frontend:${{ github.sha }} .

      - uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: frontend/Dockerfile

      - uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ecommerce-frontend:${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: "1"

      - name: Smoke deploy + Robot Framework UI smoke test
        run: |
          docker tag ecommerce-frontend:${{ github.sha }} ecommerce-frontend:dev
          docker compose -f docker-compose.yml up -d
          timeout 120 bash -c 'until curl -sf http://localhost:3000; do sleep 2; done'
          cd ../robotic-tests
          python -m venv .venv && source .venv/bin/activate
          pip install -r requirements.txt
          rfbrowser init chromium --skip-browsers
          python -m playwright install --with-deps chromium
          robot --outputdir output tests/ui/storefront_ui.robot tests/ui/auth_ui.robot
          cd ../frontend && docker compose down -v

      - name: Push image + bump dev tag (main only)
        if: github.ref == 'refs/heads/main'
        run: |
          # same pattern as backend-ci.yml, targeting frontend.image.* in values-dev.yaml
```

### `.github/workflows/promote.yml`

```yaml
name: promote

on:
  workflow_dispatch:
    inputs:
      service:
        type: choice
        options: [backend, frontend, both]
      target_env:
        type: choice
        options: [stage, prod]
      image_tag:
        description: "git SHA tag already built, scanned, and running in the environment below this one"
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    environment: ${{ inputs.target_env }}   # GitHub Environment protection rule = required reviewers for prod
    steps:
      - uses: actions/checkout@v4
      - run: |
          FILE=deployment/helm/ecommerce/values-${{ inputs.target_env }}.yaml
          if [ "${{ inputs.service }}" != "frontend" ]; then
            yq -i '.backend.image.tag = "${{ inputs.image_tag }}"' "$FILE"
          fi
          if [ "${{ inputs.service }}" != "backend" ]; then
            yq -i '.frontend.image.tag = "${{ inputs.image_tag }}"' "$FILE"
          fi
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -am "promote(${{ inputs.service }}): ${{ inputs.target_env }} -> ${{ inputs.image_tag }}"
          git push
```

ArgoCD takes it from there — `stage`/`prod` are Argo Rollout canaries per
`strategy.md`, so the promotion commit triggers a gradual traffic shift, not
an instant cutover.

## 6. Gaps to close before the first real run

1. **`ecommerce/` isn't a git repository yet** (`git init` returns "not a git
   repository"). None of the above triggers exist until this repo is
   initialized and pushed to GitHub.
2. **No unit tests exist yet.** `backend/` has Jest wired up
   (`npm test` → `jest`) but zero `*.spec.ts` files; `frontend/` has no test
   script at all. The `npm test` step in `backend-ci.yml` will currently pass
   trivially (0 tests) rather than actually gate anything — worth treating as
   a real prerequisite, not just a pipeline formality, before leaning on it
   as a quality gate.
3. **Secrets to create** once the repo exists: `SONAR_TOKEN` (SonarCloud
   project token), `STRIPE_TEST_PUBLISHABLE_KEY`, and — only once `stage`/
   `prod` promotion is actually exercised — an AWS OIDC role trust policy for
   `aws-actions/configure-aws-credentials` (no static AWS keys as GitHub
   secrets).
4. **`yq`** needs to be available on the runner for the tag-bump steps —
   either add `mikefarah/yq` as an action step or assume it's preinstalled
   (it is on `ubuntu-latest`).
