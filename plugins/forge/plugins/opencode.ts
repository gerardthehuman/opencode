import type { Plugin, PluginModule } from "@opencode-ai/plugin";

import { ForgeOptions } from "../lib/options";
import { ForgePlugin } from "../lib/plugin";

export const server: Plugin = async (input, options) => {
  try {
    return await ForgePlugin(ForgeOptions.parse(options || {}));
  } catch (error) {
    console.error("Forge plugin error:", (error as Error).message);
    await input.client.app
      .log({
        body: {
          service: "forge",
          level: "error",
          message: (error as Error).message,
        },
      })
      .catch(() => {
        // Ignore logging errors
      });
  }

  return {};
};

export const plugin: PluginModule = {
  id: "forge",
  server,
};

export default plugin;
