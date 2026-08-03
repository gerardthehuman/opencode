import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { parseJSONC, parseJSON, stringifyJSON, stringifyJSONC } from "confbox";
import diif from "microdiff";

type Plugin = string | [string, Record<string, unknown>];
type Config = Record<string, unknown> & {
  agent?: Record<string, Record<string, unknown>>;
  instructions?: string[];
  enabled_providers?: string[];
  permission?: Record<string, unknown> & {
    external_directory?: Record<string, string>;
  };
  plugin?: Plugin[];
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
  const changes = diif(from, to);

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

const configure = (name: string, mutate: (config: Config) => Config) => {
  const config = resolve(name);

  if (!config) {
    console.error(`Configuration file "${name}" not found.`);
    process.exit(1);
  }

  const input = config.parse(readFileSync(config.path, "utf8")) as Config;
  const output = mutate(structuredClone(input) as Config);

  writeFileSync(config.path, config.stringify(output), "utf8");
  report(name, input, output);
};

const definePlugins = (config: Config, plugins: Plugin[]) => {
  const getPluginName = (plugin: Plugin) => {
    if (Array.isArray(plugin)) {
      return plugin[0];
    }

    return plugin;
  };

  const additions = plugins.map(getPluginName);
  const keep = additions.filter((p) => !additions.includes(getPluginName(p)));

  return keep.concat(plugins);
};

const agents = {
  chat: {
    model: "forge/openai/gpt-5.6-luna",
    variant: "medium",
  },
  lead: {
    model: "forge/openai/gpt-5.6-terra",
    variant: "xhigh",
  },
  plan: {
    model: "forge/openai/gpt-5.6-terra",
    variant: "xhigh",
    disable: true,
  },
  code: {
    model: "forge/openai/gpt-5.6-luna",
    variant: "max",
  },
  explore: {
    model: "forge/openai/gpt-5.6-luna",
    variant: "medium",
  },
  research: {
    model: "forge/openai/gpt-5.6-terra",
    variant: "high",
  },
  review: {
    model: "forge/x-ai/grok-4.5",
    variant: "high",
  },
};

configure("opencode", (config) => {
  config.agent = config.agent || {};
  config.model = "forge/x-ai/grok-4.5";
  config.small_model = "forge/x-ai/grok-build-0.1";
  config.default_agent = "lead";

  config.instructions = Array.from(new Set(config.instructions || []).add("~/.agents/AGENTS.md"));

  config.permission = config.permission || {};
  config.permission.question = "allow";
  config.permission.external_directory = {
    ...(config.permission.external_directory || {}),
    "*": "allow",
  };

  for (const [name, override] of Object.entries(agents)) {
    config.agent[name] = { ...(config.agent[name] ?? {}), ...override };
  }

  config.plugin = definePlugins(config, [
    [
      "@plannotator/opencode@0.25.1",
      {
        workflow: "all-agents",
        planningAgents: ["plan"],
      },
    ],
    "@franlol/opencode-md-table-formatter",
    "@tarquinen/opencode-dcp",
    "opencode-pty",
    "./plugins/forge/plugins/opencode.ts",
  ]);

  return config;
});

configure("tui", (config) => {
  config.plugin = definePlugins(config, [
    "@tarquinen/opencode-dcp",
    ["opencode-session-metrics@0.2.3", { context: { show: true } }],
  ]);

  return config;
});
