import type { Config as KiloConfig } from "@kilocode/plugin";
import type { Config as OpenCodeConfig } from "@opencode-ai/plugin";

import { fileURLToPath } from "node:url";

import type { Agent } from "./types";

import { handshake } from "./handshake";
import { ForgeOptions } from "./options";

export type Config = (KiloConfig | OpenCodeConfig) & {
  skills?: {
    paths?: string[];
  };
};

const skills = fileURLToPath(new URL("../skills/", import.meta.url));

type AgentPatch = { [K in keyof Agent]?: Agent[K] | null };
const mergeAgent = (base: Agent, override: AgentPatch): Agent => {
  const agent: Agent = { ...base };

  for (const [key, value] of Object.entries(override || {}) as Array<
    [keyof Agent, AgentPatch[keyof Agent]]
  >) {
    if (value === null) {
      delete agent[key];
      continue;
    }

    agent[key] = value as Agent[typeof key];
  }

  return agent;
};
const mergeAgents = (
  ...input: Array<Record<string, Agent | AgentPatch>>
): Record<string, Agent> => {
  const agents: Record<string, Agent> = {};

  for (const agent of input) {
    for (const [name, options] of Object.entries(agent)) {
      if (name in agents) {
        agents[name] = mergeAgent(agents[name], options || {});
      } else {
        agents[name] = mergeAgent({} as Agent, options || {});
      }
    }
  }

  return agents;
};

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

        // Merge agents in order of priority: User > Plugin > Forge
        config.agent = mergeAgents(
          await forge.agents().catch(() => ({})),
          options.agent || {},
          config.agent || {},
        );

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
