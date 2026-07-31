# OpenCode Configuration for Forge

This repository adds an opinionated workflow to the
[Humanforce Forge](https://docs.forgeworkspace.dev/) OpenCode setup.

Forge manages the OpenRouter broker, model catalog, and desktop MCP connection.
This repository includes a `configure` script that applies the overrides below.

## Agents

Forge ships with multiple preset agents for specific tasks.
The primary agents, **Lead** and **Plan**, delegate work to the subagents.

This repository includes a **Chat** agent for conversations and small,
quick tasks powered by a low-cost and efficient model.

| Agent       | Model                         | Why                                                                                                           |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Chat        | GPT-5.6 Luna (`medium`)       | Fast, concise, low-cost conversation with broad multimodal and tool support.                                  |
| Lead        | Grok 4.5 (`high`)             | Strong general and tool judgment with efficient output for orchestration and final decisions.                 |
| Plan        | GPT-5.6 Terra (`xhigh`)       | Deep reasoning and a large context window suit infrequent, high-leverage architecture and decomposition work. |
| Code        | Grok 4.5 (`high`)             | Strong same-harness coding results pair a high solve rate with efficient output and fewer agent steps.        |
| Explore     | GPT-5.6 Luna (`medium`)       | Fast tool use and low output overhead suit frequent bounded discovery across large repositories.              |
| Research    | GPT-5.6 Terra (`high`)        | Strong long-context synthesis and tool use avoid the extra output overhead of `xhigh`.                        |
| Review      | Grok 4.5 (`high`)             | Strong code and tool performance make it an efficient choice for finding consequential defects.               |
| Lens        | Gemini 3.1 Flash Lite (`low`) | Broad image, PDF, video, and audio support covers faithful visual extraction without expensive reasoning.     |
| Default     | Grok 4.5                      | The safest broad, tool-capable fallback in the available model pool.                                          |
| Small model | Grok Build 0.1                | A coding-oriented, low-cost route handles lightweight internal tasks without a selectable variant.            |

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
