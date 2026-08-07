import { describe, expect, test } from "bun:test";

import plugin from "./index.js";

describe("Claude Code plugin pricing configuration", () => {
  for (const [label, options] of [
    ["default", {}],
    ["explicit subscription", { pricing: "subscription" }],
  ]) {
    test(`${label} pricing stays plugin-level and shares models between hooks`, async () => {
      const hooks = await plugin.server({}, options);
      const config = {
        provider: {
          "claude-code": { options: { pricing: "bedrock" } },
        },
      };

      await hooks.config(config);
      const configured = config.provider["claude-code"];
      const providerModels = await hooks.provider.models({
        id: "claude-code",
        models: {},
      });

      expect(configured.name).toBe("Claude Code");
      expect(configured.options.pricing).toBeUndefined();
      expect(configured.options.providerID).toBe("claude-code");
      expect(configured.models["claude-haiku-4-5"]).toMatchObject({
        name: providerModels["claude-haiku-4-5"].name,
        cost: {
          input: providerModels["claude-haiku-4-5"].cost.input,
          output: providerModels["claude-haiku-4-5"].cost.output,
          cache_read: providerModels["claude-haiku-4-5"].cost.cache.read,
          cache_write: providerModels["claude-haiku-4-5"].cost.cache.write,
        },
      });
    });
  }

  test("uses the provider-first resolved set when config runs later", async () => {
    const hooks = await plugin.server({}, {});
    const providerModels = await hooks.provider.models({
      id: "claude-code",
      models: {},
    });
    const config = {};

    await hooks.config(config);

    expect(config.provider["claude-code"].models["claude-opus-4-6"]).toMatchObject({
      name: providerModels["claude-opus-4-6"].name,
      cost: {
        input: providerModels["claude-opus-4-6"].cost.input,
        output: providerModels["claude-opus-4-6"].cost.output,
        cache_read: providerModels["claude-opus-4-6"].cost.cache.read,
        cache_write: providerModels["claude-opus-4-6"].cost.cache.write,
      },
    });
  });
});
