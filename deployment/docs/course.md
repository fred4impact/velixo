# Selling This as a Course

Notes on packaging **"From Commit to Cluster"** (the DevSecOps course built
on this `ecommerce` app — see `notes/devops-course-plan.md` for the full
curriculum) as a product, not just teaching material.

## 1. The core pitch

- **Not a toy repo.** Every other DevOps course teaches against a disposable
  "books API" or "todo app." This one ships a real 3-tier system (NestJS +
  Next.js + MySQL/MinIO/Mailpit/Stripe) with auth, cart, checkout, orders,
  and an admin panel already built — students learn pipelines and clusters
  against something with actual product surface area, not a strawman.
- **Working, not aspirational.** The test suite (70 passing Robot Framework
  + Playwright tests), the Helm/ArgoCD deployment, and both `kind` and AWS
  EKS install paths are already proven end-to-end in this repo. The sales
  claim "this works on a real cluster" is verifiable, not marketing copy.
- **One spine, not disconnected modules.** Competing courses bundle
  unrelated mini-projects per topic. Here, the pipeline built in Part 3
  deploys the exact app tested in Part 2 onto the cluster provisioned in
  Part 4 — students see one system get progressively more production-grade,
  which is the actual job, not a series of disconnected labs.

## 2. Target audience (know who's paying)

- **Primary:** junior-to-mid developers moving into DevOps/platform roles —
  the people currently buying Udemy/KodeKloud-style courses to reskill.
- **Secondary:** engineering teams who want a shared onboarding artifact for
  new hires — sell as a team/enterprise seat license, not just individual.
- **Tertiary:** bootcamp/cohort providers looking to license ready-made
  curriculum instead of building their own DevOps track from scratch.

## 3. Packaging & tiers

- **Free tier (lead magnet):** Part 0–1 (orientation + source control) plus
  the `kind-local-guide.md` walkthrough. Gets someone running the full app
  locally in under an hour — low-friction proof of the "real app" claim.
- **Core course (paid):** Parts 2–5 — testing, CI/CD, Terraform, K8s/ArgoCD.
  This is the graded, certificate-bearing track.
- **Electives add-on:** Part 6 (observability, Falco, chaos engineering,
  Karpenter, Vault, K8sGPT/AIOps) — sell as an upsell bundle for students who
  finish the core path, or as standalone deep-dive modules.
- **Capstone + review:** Part 7, sold as a premium tier with human code
  review of the student's own pipeline/deployment — this is the highest
  willingness-to-pay item since it's the "prove I can do this" credential.

## 4. Distribution channels

- **Cohort-based (highest margin):** live cohorts with instructor office
  hours, sold at a premium — the multi-part structure (0→7) maps cleanly
  onto a 6–8 week cohort schedule.
- **Self-paced on Udemy/YouTube-adjacent platforms:** lower price point,
  volume play; the free-tier orientation module works well as a YouTube
  funnel into the paid track.
- **B2B/enterprise licensing:** package the whole repo + curriculum as a
  licensable internal-training asset for companies onboarding engineers into
  platform teams.
- **GitHub-first credibility loop:** open-sourcing the `ecommerce` app itself
  (stars, forks, "built in public") drives organic discovery before anyone
  sees a paywall — the code is the top-of-funnel marketing.

## 5. Proof points to lead with in marketing copy

- "70 passing tests, two working deployment targets (local `kind` + AWS
  EKS), real GitOps with ArgoCD — not slides."
- "You'll debug the same five bugs we hit building this suite" (the
  debugging clinic in Part 2.5) — sells the course as *experience-transfer*,
  not just instruction.
- Dual CI track (GitHub Actions **and** GitLab CI) — reach both audiences
  without forking the course.
- Explicitly flagged EKS cost warning in Part 4/5 — signals honesty, builds
  trust versus courses that hide real-world cost.

## 6. Gaps to close before charging full price

- **Part 4 (Terraform) has no reference implementation yet** — it's the one
  module currently taught as "build-together" rather than from working code.
  Closing this gap is the highest-leverage next step before a paid launch,
  since it's the only part that breaks the "everything here actually runs"
  promise.
- Capstone grading rubric isn't written yet — needed before selling the
  premium reviewed-capstone tier.

## 7. Expansion / retention

- New electives (Part 6) can be added indefinitely without touching the core
  spine — gives a natural cadence for "new module drops" to re-engage past
  buyers.
- Capstone option (b) — extending the reference app with a new feature
  (wishlist, reviews) — doubles as a pipeline for turning students into
  contributors, which can feed back into course content itself.
