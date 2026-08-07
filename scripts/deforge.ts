import { configure, definePlugins } from "./configure.js";

configure("opencode", (config) => {
  config.agent = config.agent || {};
  config.provider = config.provider || {};
  config.permission = config.permission || {};
  config.mcp = config.mcp || {};

  for (const agent in config.agent) {
    if (config.agent[agent]?.model?.startsWith("openrouter/")) {
      delete config.agent[agent];
    }
  }

  if (config.model?.startsWith("openrouter/")) {
    delete config.model;
  }

  if (config.small_model?.startsWith("openrouter/")) {
    delete config.small_model;
  }

  if (config.provider.openrouter?.name?.includes("Forge")) {
    delete config.provider.openrouter;
  }

  for (const permission in config.permission) {
    if (permission.startsWith("forge_")) {
      delete config.permission[permission];
    }
  }

  for (const mcp in config.mcp) {
    if (mcp.startsWith("forge")) {
      delete config.mcp[mcp];
    }
  }

  if (
    Array.isArray(config.enabled_providers) &&
    config.enabled_providers.includes("openrouter") &&
    config.enabled_providers.length === 1
  ) {
    delete config.enabled_providers;
  }

  return config;
});

configure("tui", (config) => {
  config.plugin = definePlugins(
    config,
    [],
    [
      "./plugins/forge-tui.tsx",
      "./plugins/open-web.tsx",
      "./plugins/progress-relay.tsx",
      "./plugins/done-notifier.tsx",
      "./plugins/token-tracker.tsx",
    ],
  );

  return config;
});
