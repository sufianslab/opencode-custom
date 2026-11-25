# Private fork (`sufianslab/opencode-custom`)

This file is **only for this fork**. Upstream OpenCode rules stay in [`AGENTS.md`](AGENTS.md). Follow both.

Goal: ship a personal-assistant product on the OpenCode harness with **as little merge pain as possible** when pulling from `anomalyco/opencode`.

## Remotes and branches

- `origin` → `sufianslab/opencode-custom` (this fork)
- `upstream` → `anomalyco/opencode`
- **Default branch here is `main`.** Upstream’s default is `dev`.
- Base feature branches and PRs on `origin/main`.
- Prefer small, frequent syncs. **Do not merge upstream straight into `main` on a shared machine** — open a sync PR so `fork-pr` CI can run.

### Upstream sync (how you get engine updates)

```text
anomalyco/opencode  dev
        │  fetch
        ▼
  sync/upstream-<sha>   ← merge happens here
        │  PR
        ▼
     origin/main        ← you merge after CI + review
```

**What you get:** core, protocol, plugins, permissions, automations, bugfixes, lockfile.

**What stays inert:** their deploy/release/triage/Blacksmith workflows (gated to `anomalyco/opencode`). `fork-pr.yml` / `fork-sync.yml` stay yours.

#### Automated (preferred)

1. GitHub → **Actions** → **fork-sync** → **Run workflow**
2. Optional: set `dry_run` to only print how many commits you’re behind
3. Workflow merges `upstream/dev` onto `sync/upstream-<sha>`, re-applies workflow gates, opens a PR into `main`
4. Wait for **fork-pr** CI → review → merge the sync PR

If the merge conflicts, the workflow fails; resolve locally (below) and push the same branch pattern.

#### Manual

```bash
git remote add upstream https://github.com/anomalyco/opencode.git   # once
git fetch upstream dev
git fetch origin main
git checkout -B sync/upstream-$(git rev-parse --short upstream/dev) origin/main
git merge upstream/dev
bun script/fork/ensure-workflow-gates.ts
git push -u origin HEAD
gh pr create --base main --title "chore(fork): sync upstream/dev" --body "See AGENTS.fork.md"
```

While GitHub is still “detaching” the fork, remotes and CI still work; wait for detach to finish before changing visibility or deleting the fork network link if that matters to you.

## Prefer add-ons, not forks of the core

Put product code in **new paths**, for example:

- `packages/assistant/` (or similar) for PA domain
- `packages/plugins/<name>/` for channel / browser / connector plugins
- New workflow files under `.github/workflows/fork-*.yml`
- Skills under a fork-owned skills tree, not by rewriting upstream skills

Prefer plugins and config over rewriting `packages/core` session, permission, or automation guts.

## Avoid editing these unless there is no other option

Upstream changes these often. Touch them only with a **minimal hook**, and note why in the PR:

- `packages/core/src/session/**`
- `packages/core/src/permission/**`
- `packages/core/src/automation*`
- `packages/server/**` composition roots
- Upstream release/deploy workflows (already gated to `anomalyco/opencode`)

If you need a hook, keep the diff tiny (one import, one registration, one default agent). Put real logic in a fork-owned package.

## CI on this fork

| Workflow | Role |
|----------|------|
| `fork-pr.yml` | Lint, typecheck, Linux unit tests on PRs and pushes to `main` (ubuntu runners) |
| `fork-sync.yml` | Manual Action: merge `upstream/dev` into a sync branch and open a PR to `main` |
| Upstream `check.yml` / `check-test.yml` | Gated to `anomalyco/opencode` or `dev`/`beta` — do not rely on them here |
| Upstream triage / deploy / release | Gated to `anomalyco/opencode` so they cannot close your PRs or need Blacksmith |

Draft PRs skip `fork-pr` jobs. Mark ready for review when you want CI.

`script/fork/ensure-workflow-gates.ts` runs after an automated sync (and you can run it after a manual merge) so upstream-only jobs keep `if: github.repository == 'anomalyco/opencode'`.

## Pull requests (this repo)

1. Branch from `main` with a short name (see upstream `AGENTS.md` branch rules).
2. Keep the PR small; put PA logic in new paths.
3. Title: `type(scope): summary` (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`).
4. Fill the PR template: what changed, how you verified (at least `fork-pr` green or the equivalent local commands).
5. Fork product PRs do **not** need an upstream issue. Use `feat` / `docs` / `chore` titles so leftover triage tooling stays quiet if a guard ever slips.

Local equivalent of CI:

```bash
bun install
bun run lint
bun run typecheck:tsc
# from an affected package, e.g. packages/core:
cd packages/core && bun run test
```

## Models and placement

- Cloud LLMs and Ollama are **config / provider** concerns, not core forks.
- Do not bake model weights into application images.
- Desktop browser stays the upstream plugin split; a headless/server browser belongs in a **new** package that can speak the same RPC later.

## Review checklist

- [ ] Real logic lives outside upstream-critical files
- [ ] Any core-file touch is minimal and explained
- [ ] `fork-pr` is green (or local lint + typecheck + focused tests)
- [ ] Upstream merge into `main` is still realistic
- [ ] No secrets in Git, logs, fixtures, or client config
