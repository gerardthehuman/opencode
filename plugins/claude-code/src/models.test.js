import { providers } from "@opencode-ai/models/snapshot";
import { describe, expect, test } from "bun:test";

import { defaultModels, resolveModelsForPricing } from "./models.js";

function model(id) {
  return { [id]: defaultModels[id] };
}

function catalogModel(id, name, cost) {
  return { id, name, cost };
}

function snapshotCatalog(providerID, ids) {
  const catalog = providers[providerID]?.models;
  if (!catalog) throw new Error(`Missing ${providerID} snapshot catalog`);

  return Object.fromEntries(
    ids.map((id) => {
      const catalogModel = catalog[id];
      if (!catalogModel) throw new Error(`Missing ${id} from ${providerID} snapshot catalog`);
      return [id, catalogModel];
    }),
  );
}

function snapshotCost(cost) {
  return {
    input: cost.input,
    output: cost.output,
    cache: {
      ...(cost.cache_read !== undefined && { read: cost.cache_read }),
      ...(cost.cache_write !== undefined && { write: cost.cache_write }),
    },
  };
}

describe("resolveModelsForPricing", () => {
  for (const pricing of [undefined, "subscription"]) {
    test(`${pricing ?? "default"} uses zero-cost subscription pricing`, async () => {
      let catalogLoads = 0;
      const models = await resolveModelsForPricing(pricing, defaultModels, async () => {
        catalogLoads += 1;
        return {};
      });

      expect(catalogLoads).toBe(0);
      for (const resolved of Object.values(models)) {
        expect(resolved.name).toEndWith("(1×)");
        expect(resolved.cost).toEqual({
          input: 0,
          output: 0,
          cache: { read: 0, write: 0 },
        });
      }
    });
  }

  test("loads enterprise catalog costs in USD per million tokens", async () => {
    const models = await resolveModelsForPricing(
      "enterprise",
      model("claude-haiku-4-5"),
      async (providerID) => {
        expect(providerID).toBe("anthropic");
        return {
          "claude-haiku-4-5": catalogModel("claude-haiku-4-5", "Claude Haiku 4.5", {
            input: 1,
            output: 5,
            cache_read: 0.1,
            cache_write: 1.25,
          }),
        };
      },
    );

    const cost = models["claude-haiku-4-5"].cost;
    expect(cost).toEqual({
      input: 1,
      output: 5,
      cache: { read: 0.1, write: 1.25 },
    });

    const usage = { input: 10, output: 233, cache_read: 0, cache_write: 33_558 };
    const sessionCost =
      (usage.input * cost.input +
        usage.output * cost.output +
        usage.cache_read * cost.cache.read +
        usage.cache_write * cost.cache.write) /
      1_000_000;
    expect(sessionCost).toBeCloseTo(0.0431225, 10);
  });

  test("uses an exact normalized display name when a catalog identity differs", async () => {
    const models = await resolveModelsForPricing(
      "enterprise",
      model("claude-haiku-4-5"),
      async () => ({
        "catalog-specific-id": catalogModel("catalog-specific-id", "CLAUDE HAIKU 4.5", {
          input: 1,
          output: 5,
        }),
      }),
    );

    expect(models["claude-haiku-4-5"].cost).toEqual({
      input: 1,
      output: 5,
      cache: {},
    });
  });

  test("uses snapshot aliases before dated display-name entries for enterprise core 4.5 models", async () => {
    const catalog = providers.anthropic?.models;
    if (!catalog) throw new Error("Missing anthropic snapshot catalog");

    const local = Object.fromEntries(
      Object.entries(defaultModels).filter(([id]) => id.endsWith("-4-5")),
    );
    const models = await resolveModelsForPricing("enterprise", local, async () => catalog);

    for (const [id, localModel] of Object.entries(local)) {
      const alias = catalog[id];
      expect(alias).toBeDefined();
      expect(
        Object.values(catalog).some(
          (candidate) => candidate.id.startsWith(`${id}-`) && candidate.name === localModel.name,
        ),
      ).toBe(true);
      expect(models[id].cost).toEqual(snapshotCost(alias.cost));
    }
  });

  test("matches Bedrock models after generic provider, region, and release suffix normalization", async () => {
    const models = await resolveModelsForPricing(
      "bedrock",
      model("claude-opus-4-6"),
      async (providerID) => {
        expect(providerID).toBe("amazon-bedrock");
        return {
          "us.anthropic.claude-opus-4-6-v1:0": catalogModel(
            "us.anthropic.claude-opus-4-6-v1:0",
            "Different catalog display name",
            { input: 5, output: 25 },
          ),
        };
      },
    );

    expect(models["claude-opus-4-6"].cost).toEqual({
      input: 5,
      output: 25,
      cache: {},
    });
  });

  test("uses the canonical Bedrock snapshot entry when regional rates differ", async () => {
    const catalog = snapshotCatalog("amazon-bedrock", [
      "anthropic.claude-sonnet-4-6",
      "global.anthropic.claude-sonnet-4-6",
      "us.anthropic.claude-sonnet-4-6",
      "eu.anthropic.claude-sonnet-4-6",
    ]);
    const models = await resolveModelsForPricing(
      "bedrock",
      model("claude-sonnet-4-6"),
      async () => catalog,
    );

    expect(catalog["global.anthropic.claude-sonnet-4-6"].cost).toEqual(
      catalog["us.anthropic.claude-sonnet-4-6"].cost,
    );
    expect(catalog["eu.anthropic.claude-sonnet-4-6"].cost).not.toEqual(
      catalog["anthropic.claude-sonnet-4-6"].cost,
    );
    expect(models["claude-sonnet-4-6"].cost).toEqual(
      snapshotCost(catalog["anthropic.claude-sonnet-4-6"].cost),
    );
  });

  test("uses equal-cost regional snapshot entries but rejects differently priced ones without a canonical entry", async () => {
    const sameCostCatalog = snapshotCatalog("amazon-bedrock", [
      "global.anthropic.claude-sonnet-4-6",
      "us.anthropic.claude-sonnet-4-6",
    ]);
    const differentCostCatalog = snapshotCatalog("amazon-bedrock", [
      "global.anthropic.claude-sonnet-4-6",
      "eu.anthropic.claude-sonnet-4-6",
    ]);

    const sameCostModels = await resolveModelsForPricing(
      "bedrock",
      model("claude-sonnet-4-6"),
      async () => sameCostCatalog,
    );
    const differentCostModels = await resolveModelsForPricing(
      "bedrock",
      model("claude-sonnet-4-6"),
      async () => differentCostCatalog,
    );

    expect(sameCostModels["claude-sonnet-4-6"].cost).toEqual(
      snapshotCost(sameCostCatalog["global.anthropic.claude-sonnet-4-6"].cost),
    );
    expect(differentCostModels["claude-sonnet-4-6"].cost).toBeUndefined();
  });

  test("leaves unmatched and ambiguous paid models without fabricated costs", async () => {
    const local = model("claude-haiku-4-5");
    const unmatched = await resolveModelsForPricing("enterprise", local, async () => ({}));
    const ambiguous = await resolveModelsForPricing("bedrock", local, async () => ({
      one: catalogModel("us.anthropic.claude-haiku-4-5-v1:0", "One", { input: 1, output: 5 }),
      two: catalogModel("eu.anthropic.claude-haiku-4-5-v1:0", "Two", { input: 1.1, output: 5.5 }),
    }));

    for (const resolved of [unmatched["claude-haiku-4-5"], ambiguous["claude-haiku-4-5"]]) {
      expect(resolved.cost).toBeUndefined();
      expect(resolved.capabilities).toEqual(local["claude-haiku-4-5"].capabilities);
      expect(resolved.limit).toEqual(local["claude-haiku-4-5"].limit);
    }
  });
});
