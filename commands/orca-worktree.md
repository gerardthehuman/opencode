---
description: Create an Orca worktree and launch Forge with a task handoff
---

Create a new Orca worktree and launch Forge with a full handoff for:

```
$ARGUMENTS
```

Create + launch + report, then **stop**. Do not wait on or supervise the child agent.

## Steps

1. If `$ARGUMENTS` is empty, ask for a task and stop.
2. Ensure Orca is up: `command -v orca`, `orca status --json`; if needed `orca open --json` and re-check. Fail clearly if unreachable.
3. Expand `$ARGUMENTS` into a **self-contained** brief (resolve “this plan” / ticket refs from this session). Include goal, constraints, done-when, key paths. Do not dump the whole chat.
4. Derive a short kebab-case `--name` (≤40 chars) and a one-line `--comment`.
5. Run (quote `--prompt` safely):

```bash
orca worktree create \
  --name "<slug>" \
  --no-parent \
  --activate \
  --agent opencode \
  --prompt "<brief>" \
  --comment "<summary>" \
  --json
```

Notes: `--agent opencode` launches Forge via Orca’s override. Omit `--repo` / `--base-branch` (infer repo; use default base). Use `--no-parent` unless the user asked for stacked/child work. Optional: `--issue` / `--linear-issue` only when clear from args/context.

6. Report worktree name/path, full `id` (`repoId::path`), and agent handle (`result.agentTerminalHandle` or `result.startupTerminal.handle`). Then stop.

## Fallback

If `--agent opencode` is rejected: create without agent → `orca terminal create --worktree id:<…> --command forge --json` → send the brief (`terminal wait --for tui-idle` only if needed) → stop.

## Failures

Surface CLI errors. If the agent tab looks wrong, note Forge may not be running. If repo inference fails, stop and say so.
