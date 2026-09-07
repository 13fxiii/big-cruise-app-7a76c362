# GitHub Actions on this repo

Stack stays GitHub → Vercel → Supabase → Playwright. No AppDeploy.

## What “Browser smoke tests / 0 steps” means

A failed run with:

- job duration ~2 seconds
- zero steps
- no logs (API 404 / BlobNotFound)
- `runner_id: 0`
- billable Ubuntu minutes = 0

means GitHub never assigned a hosted runner. The workflow YAML did not run.

That has been true for every Actions run in this repo since 30 Aug 2026, including the older `CI` workflow on `codex/iphone-ci-workspace`.

## Fix on the account (not in YAML)

1. GitHub → Settings → Billing → Actions — spending limit / free minutes.
2. Repo → Settings → Actions → General — Allow all actions and reusable workflows.
3. Repo → Settings → Actions → Runners — GitHub-hosted should be available.

Then re-run **Playwright live browser QA** or push this branch.

If the **Runner canary** job prints `runner_ok`, the platform is healthy and smoke tests can run.
