import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { ForgePlugin, type Config } from "../lib/plugin";

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

test("initializes ForgePlugin against the live Forge desktop API", async () => {
  const plugin = await ForgePlugin();

  expect(typeof plugin.config).toBe("function");

  const config: Config = { enabled_providers: [] };
  await plugin.config(config);

  const provider = config.provider?.forge;
  expect(provider?.name).toBe("Forge");
  expect(hasNonEmptyString(provider?.api)).toBe(true);
  expect(hasNonEmptyString(provider?.options?.baseURL)).toBe(true);
  expect(hasNonEmptyString(provider?.options?.apiKey)).toBe(true);
  expect(isObject(provider?.models) && Object.keys(provider.models).length > 0).toBe(true);

  const mcp = config.mcp?.forge;
  expect(mcp?.type).toBe("remote");
  const remoteMcp = mcp?.type === "remote" ? mcp : undefined;
  expect(hasNonEmptyString(remoteMcp?.url)).toBe(true);
  expect(
    typeof remoteMcp?.headers?.Authorization === "string" &&
      /^Bearer \S+$/.test(remoteMcp.headers.Authorization),
  ).toBe(true);

  expect(config.enabled_providers?.includes("forge")).toBe(true);

  expect(isObject(config.agent)).toBe(true);
  expect(isObject(config.agent) && Object.keys(config.agent).length > 0).toBe(true);
  for (const [name, agent] of Object.entries(config.agent ?? {})) {
    expect(name.length > 0).toBe(true);
    expect(agent !== undefined).toBe(true);
    if (!agent) continue;

    expect(isObject(agent)).toBe(true);
    expect(typeof agent.name === "string" && agent.name.length > 0).toBe(true);
    expect(typeof agent.prompt === "string").toBe(true);
  }

  const skillsPath = fileURLToPath(new URL("../skills/", import.meta.url));
  expect(config.skills?.paths?.includes(skillsPath)).toBe(true);
});
