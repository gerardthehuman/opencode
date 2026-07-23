# Agent Instructions

Read [README.md](README.md) for installation and configuration instructions.

## Forge Environment Variables

This harness is launched by the Forge desktop app, which injects env into
the terminal before OpenCode starts. Outside Forge these may be missing.

- Models (OpenRouter): `FORGE_OPENROUTER_BROKER_BASE_URL` +
  `FORGE_SUPABASE_ACCESS_TOKEN`
- Desktop MCP tools: `FORGE_MCP_URL` + `FORGE_MCP_TOKEN`
  (local loopback into the Forge app)
- Model allowlist/catalog: `FORGE_OPENCODE_MODEL_CATALOG_JSON`
  (setup may re-merge `opencode.jsonc` when the catalog hash changes)

Edit `opencode.jsonc` and `tui.json` directly. Prefer `{env:VAR}` interpolation
for Forge-owned secrets; do not hardcode broker tokens or assume a public
OpenRouter key. Treat broker/MCP/catalog sections and TUI theme/`forge-tui` as
Forge-managed unless you know what you're doing.
