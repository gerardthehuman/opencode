# OpenCode Configuration

This is an [OpenCode](https://opencode.ai/) configuration directory for use with the [Humanforce Forge](https://docs.forgeworkspace.dev/) desktop app.

> Forge provides access to select models from OpenRouter, an MCP server to interact with the desktop app, and bundled plugins.
>
> For modifying the configuration, refer to the [OpenCode documentation](https://opencode.ai/docs/config/).

## Features

This configuration is optimized for a subagent-driven workflow powered by the following custom agents.

- **Lead** — primary orchestrator; decides, delegates to subagents, owns the final answer
- **Plan** — primary planner; evidence-based plans via explore/research
- **Code** — implements scoped code changes from clear instructions
- **Explore** — scoped local discovery and technical probes
- **Research** — external docs, APIs, and changelog lookup
- **Review** — bounded code review with evidence
- **Lens** — multimodal analysis (images, PDFs, screenshots)

### Commands

- **orca-worktree** — create an Orca worktree and launch Forge with a task handoff

### Plugins

The following plugins are also installed.

- [**Plannotator**](https://plannotator.ai/) — interface for annotating plans and code changes
- **Token Tracker** — token and cost usage in the TUI sidebar
- **Progress Relay** — live subagent progress in the TUI sidebar
- **Forge TUI** — Forge-managed desktop TUI integration

## Installation

Copy the contents of this directory to your local machine at `~/.config/opencode`.

```sh
git clone https://github.com/gerardthehuman/opencode.git ~/.config/opencode
cd ~/.config/opencode
npm install
```

Run the Forge desktop application and install the Forge CLI. Forge may manage
broker/MCP/catalog fields and the TUI theme/`forge-tui` plugin; edit
`opencode.jsonc` and `tui.json` directly for agents, plugins, and local prefs.
