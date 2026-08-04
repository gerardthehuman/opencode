import type { Plugin, PluginModule } from "@kilocode/plugin";
import { ForgePlugin } from "../lib/plugin";
import { ForgeOptions } from "../lib/options";

export const server: Plugin = async (input, options) => {
  try {
    return await ForgePlugin(ForgeOptions.parse(options || {}));
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
