# Private fork (`sufianslab/opencode-custom`)

This file is **only for this fork**. Upstream OpenCode rules stay in [`AGENTS.md`](AGENTS.md). Follow both.

Goal: ship a personal-assistant product on the OpenCode harness with **as little merge pain as possible** when pulling from `anomalyco/opencode`.

## Remotes and branches

- `origin` → `sufianslab/opencode-custom` (this fork)
- `upstream` → `anomalyco/opencode`
- **Default branch here is `main`.** Upstream’s default is `dev`.
- Base feature branches and PRs on `origin/main`.
- Sync from upstream with: `git fetch upstream` then merge or rebase `upstream/dev` into `main`. Prefer small, frequent syncs.

```bash
git remote add upstream https://github.com/anomalyco/opencode.git   # once
git fetch upstream
git checkout main
git merge upstream/dev   # or rebase; resolve conflicts carefully
git push origin main
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
| Upstream `check.yml` / `check-test.yml` | Gated to `anomalyco/opencode` or `dev`/`beta` — do not rely on them here |
| Upstream triage / deploy / release | Gated to `anomalyco/opencode` so they cannot close your PRs or need Blacksmith |

Draft PRs skip `fork-pr` jobs. Mark ready for review when you want CI.

After merging `upstream/dev`, if a triage or check workflow regains an unguarded job, re-apply `if: github.repository == 'anomalyco/opencode'` (or keep relying on `fork-pr.yml` only).

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
