# OpenCode Configuration for Forge

This repository adds an opinionated workflow to the
[Humanforce Forge](https://docs.forgeworkspace.dev/) OpenCode setup.

Forge manages the OpenRouter broker, model catalog, and desktop MCP connection. The sections below describe the local overrides.

## Agents

OpenCode starts with `lead` instead of its default agent. `lead` owns decisions
and final responses, then delegates bounded work to specialists.

| Agent      | Mode                | Model             | Role                                 |
| ---------- | ------------------- | ----------------- | ------------------------------------ |
| `lead`     | Primary             | Kimi K3 (`high`)  | Orchestration and decisions          |
| `plan`     | Primary or subagent | GLM 5.2 (`xhigh`) | Evidence-based plans                 |
| `code`     | Subagent            | Grok 4.5 (`high`) | Scoped implementation                |
| `explore`  | Subagent            | DeepSeek V4 Pro   | Local discovery and technical probes |
| `research` | Subagent            | DeepSeek V4 Pro   | External documentation and research  |
| `review`   | Subagent            | Grok 4.5 (`high`) | Read-only code review                |
| `lens`     | Subagent            | MiniMax M3        | Visual and document analysis         |
| `chat`     | Primary             | MiniMax M3        | Fast general conversation            |

Specialists have narrow permissions and explicit stop conditions. Longer tasks
emit structured `[PROGRESS]` updates.

## Models

The default model is Grok 4.5. Grok Build handles small-model tasks. Agent
assignments are pinned by `scripts/configure.ts`; Forge still manages the
available model catalog and broker credentials.

## Plugins

### OpenCode

- [Plannotator](https://plannotator.ai/) `0.25.0` annotates plans and code
  changes for all agents.
- `@tarquinen/opencode-dcp` prunes context dynamically using `dcp.jsonc`.
- `opencode-pty` provides PTY-backed terminals.

### TUI

- `@tarquinen/opencode-dcp` integrates context pruning.
- `opencode-session-metrics` `0.2.3` shows session and context usage.

Forge's theme and local `forge-tui` logo integration remain Forge-managed.
Local plugin files are inactive unless registered in `tui.json`. Currently,
`done-notifier`, `open-web`, `progress-relay`, and `token-tracker` are not
loaded.

## Commands

- `/insights` reports Forge usage, OpenCode statistics, and repository activity.
- `/orca-worktree` launches Forge in a new Orca worktree with a task handoff.
- `/plannotator-annotate`, `/plannotator-last`, and `/plannotator-review`
  open Plannotator workflows.

## Tools

Beyond Forge's desktop MCP server, the configuration enables:

- Context7 for library documentation (`CONTEXT7_API_KEY`)
- grep.app for public GitHub code search
- Exa for web search (`EXA_API_KEY`)

It also loads global instructions from `~/.agents/AGENTS.md` and discovers
skills from `~/.codex/skills`.

## Permissions

Agent questions and all external-directory access are allowed. Explicit
directory entries also cover `/tmp`, `/var`, and `~/.agents`.

Review these settings before using the configuration outside a trusted local
development environment.

## Setup

Clone the repository and install dependencies:

```sh
git clone https://github.com/gerardthehuman/opencode.git ~/.config/opencode
cd ~/.config/opencode

# Use Bun, OpenCode, or Forge
bun install
BUN_BE_BUN=1 opencode install
BUN_BE_BUN=1 forge install
```

Launch Forge once to inject its managed settings. After Forge regenerates the
configuration, reapply the local overrides:

```sh
# Use Bun, OpenCode, or Forge
bun run configure
BUN_BE_BUN=1 opencode run configure
BUN_BE_BUN=1 forge run configure
```

Edit `opencode.jsonc` and `tui.json` directly, but never hardcode Forge
credentials. Forge secrets use `{env:VAR}` interpolation, and managed sections
may be re-merged when the model catalog changes.
