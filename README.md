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

### Commands

- **orca-worktree** — create an Orca worktree and launch Forge with a task handoff

### Plugins

The following plugins are also installed.

- [**Plannotator**](https://plannotator.ai/) — a tool that provides an interface for user to annotate plans and code changes 
- **Token Tracker** — a plugin that shows token and cost usage for the session in the TUI sidebar

## Installation

Copy the contents of this directory to your local machine at `~/.config/opencode`.

```sh
git clone https://github.com/gerardthehuman/opencode.git ~/.config/opencode
```

Run the Forge desktop application and install the Forge CLI. Run the forge command in your terminal or in the terminal window of the Forge desktop app. Forge overwrites the configuration with its built-in defaults.

- A sole provider which is an OpenRouter proxy
- A custom Forge plugin and MCP server
- The [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) plugin with a custom preset using Forge-provided models

Run the `configure` script to apply our configuration on top of Forge defaults.

```sh
cd ~/.config/opencode
npm install
npm run configure
```

When Forge updates, it resets the configuration to its own — run the script again to re-apply.