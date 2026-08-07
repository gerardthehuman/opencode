import { Models, type Model, type ProviderMap } from "@opencode-ai/models";

import type { OpenCodeModel } from "./opencode-types.js";
import type { ClaudeCodePricing } from "./types.js";

const PROVIDER_ID = "claude-code";
const NPM = "@khalilgharbaoui/opencode-claude-code-plugin";

const reasoningVariants: Record<string, Record<string, unknown>> = {
  low: { reasoningEffort: "low" },
  medium: { reasoningEffort: "medium" },
  high: { reasoningEffort: "high" },
  xhigh: { reasoningEffort: "xhigh" },
  max: { reasoningEffort: "max" },
};

const baseCapabilities = {
  temperature: false,
  attachment: true,
  toolcall: true,
  input: { text: true, audio: false, image: true, video: false, pdf: false },
  output: { text: true, audio: false, image: false, video: false, pdf: false },
  interleaved: false as const,
};

function defineModel(opts: {
  id: string;
  name: string;
  family: string;
  reasoning: boolean;
  context: number;
  output: number;
  releaseDate: string;
  status?: OpenCodeModel["status"];
}): OpenCodeModel {
  return {
    id: opts.id,
    providerID: PROVIDER_ID,
    api: { id: opts.id, url: "", npm: NPM },
    name: opts.name,
    family: opts.family,
    capabilities: { ...baseCapabilities, reasoning: opts.reasoning },
    limit: { context: opts.context, output: opts.output },
    status: opts.status ?? "active",
    options: {},
    headers: {},
    release_date: opts.releaseDate,
    variants: opts.reasoning ? reasoningVariants : undefined,
  };
}

/**
 * Convert an OpenCodeModel to the flat config schema that OpenCode's
 * provider.ts config parser expects (model.temperature, model.reasoning,
 * model.cost.cache_read, model.modalities, etc.).
 */
export function toConfigModel(model: OpenCodeModel): Record<string, unknown> {
  const inputMods: string[] = [];
  const outputMods: string[] = [];
  for (const [k, v] of Object.entries(model.capabilities.input)) {
    if (v) inputMods.push(k);
  }
  for (const [k, v] of Object.entries(model.capabilities.output)) {
    if (v) outputMods.push(k);
  }

  return {
    id: model.api.id,
    name: model.name,
    status: model.status,
    family: model.family ?? "",
    release_date: model.release_date,

    temperature: model.capabilities.temperature,
    reasoning: model.capabilities.reasoning,
    attachment: model.capabilities.attachment,
    tool_call: model.capabilities.toolcall,
    modalities: { input: inputMods, output: outputMods },

    ...(model.cost && {
      cost: {
        input: model.cost.input,
        output: model.cost.output,
        ...(model.cost.cache.read !== undefined && { cache_read: model.cost.cache.read }),
        ...(model.cost.cache.write !== undefined && { cache_write: model.cost.cache.write }),
      },
    }),

    limit: model.limit,
    options: model.options,
    headers: model.headers,
    variants: model.variants,
  };
}

export const defaultModels: Record<string, OpenCodeModel> = {
  "claude-haiku-4-5": defineModel({
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    family: "haiku",
    reasoning: false,
    context: 200_000,
    output: 64_000,
    releaseDate: "2025-10-01",
  }),
  "claude-sonnet-4-5": defineModel({
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    family: "sonnet",
    reasoning: true,
    context: 200_000,
    output: 64_000,
    releaseDate: "2025-09-29",
  }),
  "claude-sonnet-4-6": defineModel({
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    family: "sonnet",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2025-06-19",
  }),
  "claude-sonnet-5": defineModel({
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    family: "sonnet",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2026-06-30",
  }),
  "claude-opus-4-5": defineModel({
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    family: "opus",
    reasoning: true,
    context: 200_000,
    output: 64_000,
    releaseDate: "2025-11-01",
  }),
  "claude-opus-4-6": defineModel({
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    family: "opus",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2025-06-19",
  }),
  "claude-opus-4-7": defineModel({
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    family: "opus",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2025-07-16",
  }),
  "claude-opus-4-8": defineModel({
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    family: "opus",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2026-05-28",
  }),
  "claude-opus-5": defineModel({
    id: "claude-opus-5",
    name: "Claude Opus 5",
    family: "opus",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2026-07-24",
  }),
  "claude-fable-5": defineModel({
    id: "claude-fable-5",
    name: "Claude Fable 5",
    family: "fable",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2026-06-09",
  }),
  // Mythos 5 shares Fable 5's capabilities without the safety classifiers;
  // limited availability via Project Glasswing. `claude --model
  // claude-mythos-5` simply errors for accounts without access, so it's safe to
  // register unconditionally.
  "claude-mythos-5": defineModel({
    id: "claude-mythos-5",
    name: "Claude Mythos 5",
    family: "mythos",
    reasoning: true,
    context: 1_000_000,
    output: 128_000,
    releaseDate: "2026-06-09",
  }),
};

type CatalogProviderID = "anthropic" | "amazon-bedrock";
export type CatalogModel = Pick<Model, "id" | "name" | "cost">;
export type CatalogModelLoader = (
  providerID: CatalogProviderID,
) => Promise<Record<string, CatalogModel> | undefined>;

let catalogProviders: Promise<ProviderMap> | undefined;

function getCatalogProviders(): Promise<ProviderMap> {
  catalogProviders ??= Models.make()
    .providers({ signal: AbortSignal.timeout(8_000) })
    .catch(async () => (await import("@opencode-ai/models/snapshot")).providers);
  return catalogProviders;
}

async function loadCatalogModels(
  providerID: CatalogProviderID,
): Promise<Record<string, CatalogModel> | undefined> {
  const providers = await getCatalogProviders();
  return providers[providerID]?.models;
}

function normalizeModelIdentity(value: string): string {
  const parts = value
    .trim()
    .toLowerCase()
    .split(/[./:_]+/)
    .filter(Boolean);
  const modelStart = parts.findIndex((part) => part === "claude" || part.startsWith("claude-"));
  const identity = (modelStart === -1 ? parts : parts.slice(modelStart))
    .join("-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Bedrock appends a generic deployment release suffix such as `-v1:0`.
  return identity.replace(/-v\d+(?:-\d+)*$/u, "");
}

function normalizeDisplayName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function catalogNamespace(value: string): string[] {
  const parts = value
    .trim()
    .toLowerCase()
    .split(/[./:_]+/)
    .filter(Boolean);
  const modelStart = parts.findIndex((part) => part === "claude" || part.startsWith("claude-"));
  return modelStart === -1 ? [] : parts.slice(0, modelStart);
}

function isNamespaceSuffix(namespace: string[], value: string[]): boolean {
  return (
    namespace.length <= value.length &&
    namespace.every((part, index) => part === value[value.length - namespace.length + index])
  );
}

function stableModelIDSort(left: CatalogModel, right: CatalogModel): number {
  return left.id === right.id ? 0 : left.id < right.id ? -1 : 1;
}

function costPayloadKey(cost: CatalogModel["cost"]): string {
  return JSON.stringify(
    Object.entries(cost ?? {}).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
}

function selectCatalogCandidate(candidates: CatalogModel[]): CatalogModel | undefined {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const sorted = [...candidates].sort(stableModelIDSort);
  const [first] = sorted;
  if (sorted.every((candidate) => costPayloadKey(candidate.cost) === costPayloadKey(first.cost))) {
    return first;
  }

  // Regional entries prepend a namespace to the catalog's normal vendor
  // namespace (for example, `us.anthropic.*` vs `anthropic.*`). Derive the
  // common suffix from the candidate IDs instead of maintaining region maps.
  const canonicalCandidates = sorted.filter((candidate) => {
    const namespace = catalogNamespace(candidate.id);
    return sorted.every((other) => isNamespaceSuffix(namespace, catalogNamespace(other.id)));
  });

  return canonicalCandidates.length === 1 ? canonicalCandidates[0] : undefined;
}

function matchingCatalogModel(
  model: OpenCodeModel,
  catalog: Record<string, CatalogModel>,
): CatalogModel | undefined {
  const identity = normalizeModelIdentity(model.api.id);
  const displayName = normalizeDisplayName(model.name);
  const identityCandidates: CatalogModel[] = [];
  const displayNameCandidates: CatalogModel[] = [];

  for (const candidate of Object.values(catalog)) {
    if (normalizeModelIdentity(candidate.id) === identity) identityCandidates.push(candidate);
    if (normalizeDisplayName(candidate.name) === displayName) displayNameCandidates.push(candidate);
  }

  // Do not merge identity and display-name candidates: a catalog alias is a
  // stronger match than a dated entry that merely shares its display name.
  return selectCatalogCandidate(
    identityCandidates.length > 0 ? identityCandidates : displayNameCandidates,
  );
}

function isCost(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function toOpenCodeCost(cost: Model["cost"]): OpenCodeModel["cost"] | undefined {
  if (!cost || !isCost(cost.input) || !isCost(cost.output)) return undefined;

  return {
    // Both models.dev and OpenCode model config use USD per 1M tokens.
    input: cost.input,
    output: cost.output,
    cache: {
      ...(isCost(cost.cache_read) && { read: cost.cache_read }),
      ...(isCost(cost.cache_write) && { write: cost.cache_write }),
    },
  };
}

function withoutCost(model: OpenCodeModel): Omit<OpenCodeModel, "cost"> {
  const { cost: _, ...withoutCost } = model;
  return withoutCost;
}

function withSubscriptionPricing(model: OpenCodeModel): OpenCodeModel {
  return {
    ...withoutCost(model),
    name: `${model.name.replace(/\s+\(\d+×\)$/u, "")} (1×)`,
    cost: {
      input: 0,
      output: 0,
      cache: { read: 0, write: 0 },
    },
  };
}

/**
 * Resolves the plugin's local model definitions for one billing display mode.
 * Paid pricing is read only from the selected models.dev provider; unmatched
 * or ambiguous catalog entries deliberately retain no cost.
 */
export async function resolveModelsForPricing(
  pricing: ClaudeCodePricing = "subscription",
  models: Record<string, OpenCodeModel> = defaultModels,
  loadModels: CatalogModelLoader = loadCatalogModels,
): Promise<Record<string, OpenCodeModel>> {
  if (pricing === "subscription") {
    return Object.fromEntries(
      Object.entries(models).map(([id, model]) => [id, withSubscriptionPricing(model)]),
    );
  }

  const catalog = await loadModels(pricing === "enterprise" ? "anthropic" : "amazon-bedrock");
  return Object.fromEntries(
    Object.entries(models).map(([id, model]) => {
      const match = catalog && matchingCatalogModel(model, catalog);
      const cost = match && toOpenCodeCost(match.cost);
      return [id, cost ? { ...withoutCost(model), cost } : withoutCost(model)];
    }),
  );
}
