import type { Config as OpenCodeConfig } from "@opencode-ai/plugin";

import { parseJSONC, parseJSON, stringifyJSON, stringifyJSONC } from "confbox";
import diff from "microdiff";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import type { JSONSchema as JsonSchema } from "./sort.js";

import { sortJsonBySchema } from "./sort.js";

type Plugin = NonNullable<Config["plugin"]>[number];
type Config = Omit<OpenCodeConfig, "permission"> & {
  default_agent?: string;
  permission?: Record<string, unknown>;
};

const __root = fileURLToPath(new URL("../", import.meta.url));

const resolve = (name: string) => {
  const extensions = {
    jsonc: [parseJSONC, stringifyJSONC],
    json: [parseJSON, stringifyJSON],
  };

  for (const [ext, [parse, stringify]] of Object.entries(extensions)) {
    const path = `${__root}/${name}.${ext}`;
    if (existsSync(path)) {
      return { path, parse, stringify };
    }
  }

  return null;
};

const report = (name: string, from: Config, to: Config) => {
  const changes = diff(from, to);

  console.log(name);

  if (changes.length === 0) {
    console.log("  unchanged");
  }

  for (const change of changes) {
    const path = change.path
      .map((x, i) => (typeof x === "number" ? `[${x}]` : i ? `.${x}` : x))
      .join("");

    switch (change.type) {
      case "CHANGE":
        console.log(
          `  ~ ${path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.value)}`,
        );
        break;
      case "CREATE":
        console.log(`  + ${path}: ${JSON.stringify(change.value)}`);
        break;
      default:
        console.log(`  - ${path}: ${JSON.stringify(change.oldValue)}`);
    }
  }
};

const configure = async (name: string, mutate: (config: Config) => Config) => {
  const config = resolve(name);

  if (!config) {
    console.error(`Configuration file "${name}" not found.`);
    process.exit(1);
  }

  const input = config.parse(readFileSync(config.path, "utf8")) as Config;
  let output = mutate(structuredClone(input) as Config);

  try {
    if (typeof input.$schema === "string" && input.$schema.trim()) {
      const schema = await fetch(input.$schema).then((res) => res.json());
      output = sortJsonBySchema(output, schema as JsonSchema, { unknownProperties: "alphabetic" });
    }
  } catch (error) {
    console.warn(
      "Unable to retrieve schema. " + (error instanceof Error ? error.message : String(error)),
    );
  }

  writeFileSync(config.path, config.stringify(output), "utf8");
  report(name, input, output);
};

const definePlugins = (config: Config, plugins: Plugin[], block: string[] = []) => {
  const getPluginName = (plugin: Plugin) => {
    const id = Array.isArray(plugin) ? plugin[0] : plugin;
    const isLocal = [".", "/", "file://"].some((prefix) => id.startsWith(prefix));

    if (!isLocal) {
      const pattern = /^((?:@[^/@]+\/)?[^@]+)(?:@(.+))?$/;
      const [name, _] = pattern.exec(id)?.slice(1) ?? [];

      if (name) return name;
    }

    return id;
  };

  const additions = plugins.map(getPluginName);
  const keep: Plugin[] = (config.plugin ?? []).filter((p) => {
    const name = getPluginName(p);

    return !additions.includes(name) && !block.includes(name);
  });

  return keep.concat(plugins);
};

configure("opencode", (config) => {
  config.default_agent = "lead";
  config.instructions = Array.from(new Set(config.instructions || []).add("~/.agents/AGENTS.md"));

  config.provider = config.provider || {};

  config.permission = config.permission || {};
  config.permission.question = "allow";
  config.permission.external_directory = {
    ...(config.permission.external_directory || {}),
    "/**": "allow",
    "*": "allow",
  };

  config.plugin = definePlugins(
    config,
    [
      "@franlol/opencode-md-table-formatter",
      "@gblab/opencode-dcp",
      "opencode-pty",
      [
        "@plannotator/opencode@0.26.2",
        {
          workflow: "all-agents",
          planningAgents: ["plan"],
        },
      ],
      ["./plugins/claude-code/src/index.ts", { pricing: "enterprise" }],
      [
        "./plugins/forge/plugins/opencode.ts",
        {
          model: "forge/openai/gpt-5.6-terra",
          small_model: "forge/openai/gpt-5.6-luna",
          agent: {
            chat: {
              model: "forge/openai/gpt-5.6-luna",
              variant: "medium",
            },
            lead: {
              model: "forge/openai/gpt-5.6-sol",
              variant: "xhigh",
              prompt: null,
            },
            plan: {
              model: "forge/openai/gpt-5.6-terra",
              variant: "xhigh",
              disable: true,
            },
            code: {
              model: "forge/openai/gpt-5.6-terra",
              variant: "xhigh",
              prompt: null,
            },
            explore: {
              model: "forge/openai/gpt-5.6-luna",
              variant: "medium",
              prompt: null,
            },
            research: {
              model: "forge/openai/gpt-5.6-terra",
              variant: "high",
              prompt: null,
            },
            review: {
              model: "forge/x-ai/grok-4.5",
              variant: "high",
              prompt: null,
            },
          },
        },
      ],
    ],
    ["@tarquinen/opencode-dcp", "@khalilgharbaoui/opencode-claude-code-plugin"],
  );

  return config;
});

configure("tui", (config) => {
  config.plugin = definePlugins(
    config,
    ["@gblab/opencode-dcp", ["opencode-session-metrics@0.3.1", { context: { show: true } }]],
    ["@tarquinen/opencode-dcp"],
  );

  return config;
});
