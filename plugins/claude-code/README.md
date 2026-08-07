# Claude Code provider (vendored)

## Purpose and scope

This directory is a deliberately pruned vendored copy of
[`khalilgharbaoui/opencode-claude-code-plugin`](https://github.com/khalilgharbaoui/opencode-claude-code-plugin).
It supplies the local `claude-code` provider that routes OpenCode model traffic
through the installed Claude CLI.

OpenCode loads `./plugins/claude-code/src/index.ts` directly. This is not a
published package and has no local build or release lifecycle.

### Retained

- One canonical `claude-code` provider.
- Normal Claude CLI authentication and streaming.
- Default OpenCode tool proxying.
- OpenCode MCP configuration bridging to Claude.

### Intentionally removed

- Multi-account provider expansion.
- Interactive PTY transport.
- Diagnostics and stale npm-install cleanup.
- Upstream tests, simulations, build configuration, and CI/release files.

Do not restore removed features incidentally while updating this subtree.

## Configuration

The provider display name is **Claude Code**. Its plugin tuple accepts an
optional `pricing` option:

- `"subscription"` — the default when omitted; uses zero-cost accounting and
  `(1×)` display-name suffixes.
- `"enterprise"` — dynamically reads the `anthropic` provider catalog from
  `@opencode-ai/models`.
- `"bedrock"` — dynamically reads the `amazon-bedrock` provider catalog from
  `@opencode-ai/models`.

Base model definitions own their IDs, names, capabilities, and limits.
`subscription` forces zero accounting costs and `(1×)` display names. For paid
`enterprise` and `bedrock` modes, costs are dynamically sourced from the
selected `@opencode-ai/models` catalog; no rates are statically bundled. The
following is documentation-only, illustrative tuple syntax:

```jsonc
["./plugins/claude-code/src/index.ts", { "pricing": "enterprise" }]
```

## Source and dependencies

Keep runtime source under `src/` and preserve the direct entry point above.
Runtime and development dependencies are declared in this directory's
`package.json` and locked in its local `bun.lock`. Install them separately from
the repository root:

```bash
bun install --cwd plugins/claude-code
```

Do not add generated `dist/`, a build step, or a publish workflow.

## Upstream baseline and updates

The initial subtree baseline is upstream `v0.12.0` at
`8eea128c7c6466ff634055a2b0e1ac8f8d26410e`. It was imported with:

```bash
git subtree add --prefix=plugins/claude-code \
  https://github.com/khalilgharbaoui/opencode-claude-code-plugin.git \
  8eea128c7c6466ff634055a2b0e1ac8f8d26410e --squash
```

The subtree has no independent branch; maintain it from the root repository's
existing `dev` branch.

For a future upstream update:

1. Start with a clean worktree on `dev` and choose a reviewed upstream ref.
2. Pull the subtree from the repository root:

   ```bash
   git subtree pull --prefix=plugins/claude-code \
     https://github.com/khalilgharbaoui/opencode-claude-code-plugin.git \
     <upstream-ref> --squash
   ```

3. Resolve conflicts deliberately, then reapply this directory's pruning and
   local metadata where appropriate.
4. Review the resulting file list and diff before accepting the update.

Subtree pulls can conflict with local pruning and can reintroduce intentionally
removed files. Treat an update as a reviewable merge, not a mechanical version
bump.

## License provenance

Upstream declared the package MIT but did not include a license file. The local
[`LICENSE`](./LICENSE) records that provenance transparently and preserves
attribution to unixfox (original work) and Khalil Gharbaoui (fork changes).

## Maintainer checks

Run these from the repository root after a documentation-only change:

```bash
bun run format -- --check plugins/claude-code/README.md
git diff --check
git diff -- plugins/claude-code/README.md
```

These checks cover formatting and the scoped diff only. They do not validate
live Claude authentication, CLI streaming, proxy tools, or MCP bridging.
