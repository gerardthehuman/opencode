# Gerard's OpenCode Configuration

An opinionated configuration for **OpenCode**,
with custom integration with [**Humanforce Forge**](https://docs.forgeworkspace.dev/).

> ⚠️ **This not designed for Forge CLI**.
> This setup integrates directly with the desktop app and stil requires it to be installed.
>
> See [Why Not Forge CLI](#why-not-forge-cli) for more information.

## Usage

Clone the repository to your OpenCode configuration directory
and install the dependencies.

```sh
git clone https://github.com/gerardthehuman/opencode.git ~/.config/opencode
cd ~/.config/opencode

BUN_BE_BUN=1 opencode install
bun install # if you have Bun
```

The `configure` script applies **my personal configuration** to your OpenCode setup. It tries to merge with your existing configuration, but it is recommended to back up your configuration first.

```sh
BUN_BE_BUN=1 opencode run configure
bun run configure # if you have Bun
```

## Features

### Agents

**Chat** and **Lead** are the primary agents. **Chat** handles normal
interaction; **Lead** is the default orchestrator for bounded
work through **Explore**, **Research**, **Code**, and **Review**.

The **Plan** and **Lens** agents are removed and disabled.
A capable **Lead** agent can execute their tasks instead.

### Forge Integration

This setup includes custom plugin that does most of the CLI wrapper functions
within OpenCode runtime:

- Detects the Forge desktop app status and sign in state
- Installs the Forge MCP for access to Forge connections (Jira, Slack, etc.)
  independently when MCP discovery succeeds.

When Forge is available, the plugin installs a custom OpenRouter provider
to give access to Forge's model selection. The plugin can also be configured
to assign models to different agents and roles.

The setup below activates when the Forge models are available.

| Agent    | Model                        | Variant |
| -------- | ---------------------------- | ------- |
| Chat     | `forge/openai/gpt-5.6-luna`  | medium  |
| Lead     | `forge/openai/gpt-5.6-sol`   | xhigh   |
| Code     | `forge/openai/gpt-5.6-terra` | xhigh   |
| Explore  | `forge/openai/gpt-5.6-luna`  | medium  |
| Research | `forge/openai/gpt-5.6-terra` | high    |
| Review   | `forge/x-ai/grok-4.5`        | high    |

Change your model preferences, by editing the plugin configuration.

```jsonc
[
  "./plugins/forge/plugins/opencode.ts",
  {
    // Default model for all agents
    "model": "forge/openai/gpt-5.6-terra",
    "agent": {
      // Set model for the Lead agent
      "lead": {
        "model": "forge/openai/gpt-5.6-sol",
        "variant": "xhigh",
      },
    },
  },
]
```

**Your configuration always wins.** If you set a model preference in your
OpenCode configuration, it will take precedence over the Forge plugin preferences.

### Plugins

This setup includes the following quality-of-life plugins.

- **@plannotator/opencode** - a visual annonation tool for plans and code reviews.
- **@tarquinen/opencode-dcp** - dynamically prune context for token savings.
- **@franlol/opencode-md-table-formatter** - makes markdown tables made by the agent look pretty.
- **opencode-session-metrics** - improved token usage tracker, with better performance.

### Commands

- `/insights` reports OpenCode statistics and repository activity, and includes
  Forge usage when the Forge service is available.
- `/orca-worktree` is an optional Orca worktree helper with a task handoff. Normal
  OpenCode setup and use do not require Forge, but this helper can launch Forge
  through Orca's override or fallback when invoked.
- `/plannotator-annotate`, `/plannotator-last`, and `/plannotator-review`
  open Plannotator workflows.

### Tools

The configuration independently enables these remote MCP services:

- Context7 for library documentation (`CONTEXT7_API_KEY`)
- grep.app for public GitHub code search
- Exa for web search (`EXA_API_KEY`)

### Instructions and Skills

This setup also loads global instructions from `~/.agents/AGENTS.md` and discovers
skills from `~/.codex/skills`.

### Permissions

This grants permission to use the `question` tool and
allows read and write access to all directories.

## Why Not Forge CLI

The Forge CLI is a wrapper that injects runtime environment variables
and mutates the OpenCode configuration directly - which means OpenCode
is now limited unless launched with the Forge CLI.

This works when using the terminal alone - but not as well when you want
to use the wider OpenCode ecosystem such as the desktop app, web app,
and other integrations.
