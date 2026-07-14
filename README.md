# OpenCode Configuration

This is an [OpenCode](https://opencode.ai/) configuration directory for use with the [Humanforce Forge](https://docs.forgeworkspace.dev/) desktop app.

Forge provides access to select models from OpenRouter, an MCP server to interact with the desktop app, and bundled plugins.

For modifying the configuration, refer to the [OpenCode documentation](https://opencode.ai/docs/config/).

## Installation

Copy the contents of this directory to your local machine at `~/.config/opencode`.

```sh
git clone https://github.com/gerardthehuman/opencode.git ~/.config/opencode
```

Run the `configure` command in your terminal.

```sh
cd ~/.config/opencode
npm install
npm run configure
```

Run the Forge desktop application and install the Forge CLI. Run the forge command in your terminal or in the terminal window of the Forge desktop app.

Forge overwrites the OpenCode configuration during updates which can remove our custom configuration. Re-run the configure command after updates to restore the configuration.