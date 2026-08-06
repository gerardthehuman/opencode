import type { Config as KiloConfig } from "@kilocode/plugin";
import type { Config as OpenCodeConfig } from "@opencode-ai/plugin";
import { fileURLToPath } from "node:url";
import { handshake } from "./handshake";
import { ForgeOptions } from "./options";

type Config = (KiloConfig | OpenCodeConfig) & {
  skills?: {
    paths?: string[];
  };
};

const skills = fileURLToPath(new URL("../skills/", import.meta.url));

export async function ForgePlugin(options: ForgeOptions = ForgeOptions.parse({})) {
  const forge = await handshake();
  const provider = await forge.provider();
  const mcp = await forge.mcp();

  return {
    config: async (config: Config) => {
      if (provider) {
        config.provider = config.provider || {};
        config.provider.forge = provider;

        if (config.model && options.model) {
          config.model = options.model;
        }

        if (config.small_model && options.small_model) {
          config.small_model = options.small_model;
        }

        if (options.agent) {
          config.agent = config.agent || {};

          for (const [agentName, agentOptions] of Object.entries(options.agent)) {
            config.agent[agentName] = {
              ...config.agent[agentName],
              ...agentOptions,
            };
          }
        }

        if (
          Array.isArray(config.enabled_providers) &&
          !config.enabled_providers.includes("forge")
        ) {
          config.enabled_providers.push("forge");
        }
      }

      if (mcp) {
        config.mcp = config.mcp || {};
        config.mcp.forge = mcp;
      }

      config.skills = {
        ...(config.skills || {}),
        paths: [...(config.skills?.paths || []), skills],
      };
    },
  };
}
