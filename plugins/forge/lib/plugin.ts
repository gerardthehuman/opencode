import type { Config as KiloConfig } from "@kilocode/plugin";
import type { Config as OpenCodeConfig } from "@opencode-ai/plugin";
import { handshake } from "./handshake";

type Config = KiloConfig | OpenCodeConfig;

export async function ForgePlugin() {
  const forge = await handshake();
  const provider = await forge.provider();
  const mcp = await forge.mcp();

  return {
    config: async (config: Config) => {
      if (provider) {
        config.provider = config.provider || {};
        config.provider.forge = provider;

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
    },
  };
}
