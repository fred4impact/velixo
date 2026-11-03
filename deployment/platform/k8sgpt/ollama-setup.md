# K8sGPT + Ollama

K8sGPT is a CLI, not a cluster workload — no Helm chart/values file here
unlike the other five phases. This is the setup note the CLI depends on;
full numbered steps (including the Prometheus integration and the
deliberately-broken-config validation exercise) are in
`docs/electives-install-guide.md` §6.

## Why local Ollama instead of a hosted API

K8sGPT can call OpenAI/Anthropic/etc., but this app's whole electives track
has been "run this against your own cluster with no external account
dependencies beyond AWS for EKS itself" (Vault instead of a second AWS
credential, in-cluster Grafana instead of a hosted SaaS). Ollama keeps
K8sGPT's diagnosis step consistent with that — a local model, no API key,
no per-token cost while iterating.

## Install

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve &            # if not already running as a service
curl localhost:11434       # sanity check
```

## Point K8sGPT at it

```bash
curl -LO https://github.com/k8sgpt-ai/k8sgpt/releases/latest/download/k8sgpt_$(uname -s)_$(uname -m).tar.gz
tar -xzf k8sgpt_*.tar.gz && sudo mv k8sgpt /usr/local/bin/
k8sgpt auth add -b ollama -m llama3.2 -u http://localhost:11434
```

## Where this runs

- **Local `kind` work**: on your own machine, alongside `kind`/`kubectl` —
  simplest, since `kubectl` is already pointed at the right cluster.
- **CI-time diagnostics** (optional, not required for the core pipeline in
  `devsecops-pipeline.md`): a self-hosted runner with Ollama pre-pulled,
  invoked as a post-deploy diagnostic step rather than a gate — K8sGPT's
  output is meant to be read, not parsed for a pass/fail exit code.
