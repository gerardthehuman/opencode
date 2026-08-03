import type { Plugin, PluginModule } from "@opencode-ai/plugin";
import { ForgePlugin } from "../lib/plugin";

export const server: Plugin = async (input) => {
  try {
    return await ForgePlugin();
  } catch (error) {
    await input.client.app
      .log({
        body: {
          service: "forge",
          level: "error",
          message: (error as Error).message,
        },
      })
      .catch(() => {
        /* logging must not affect provider resolution */
      });
  }

  return {};
};

export const plugin: PluginModule = {
  id: "forge",
  server,
};

export default plugin;
