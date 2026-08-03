import { Models, type Model } from "@opencode-ai/models";

const ModelProviders = Models.make()
  .providers({ signal: AbortSignal.timeout(8_000) })
  .catch(async () => (await import("@opencode-ai/models/snapshot")).providers);
const ModelProperties = [
  "id",
  "name",
  "cost",
  "limit",
  "tool_call",
  "reasoning",
  "reasoning_options",
  "temperature",
  "modalities",
  "attachment",
] as const;

type ModelProperty = (typeof ModelProperties)[number];
type ModelData = Pick<Model, ModelProperty>;

export async function getModels(
  list: Array<Partial<Model> & { id: string; name: string }>,
): Promise<Record<string, ModelData>> {
  const { openrouter } = await ModelProviders;

  if (!openrouter || !openrouter.models) {
    return {};
  }

  const models: Record<string, ModelData> = {};

  for (const item of list) {
    models[item.id] = { ...item } as ModelData;

    if (item.id in openrouter.models) {
      const source = openrouter.models[item.id]!;
      const data = Object.fromEntries(
        ModelProperties.map((prop) => [prop, source[prop]]),
      ) as ModelData;

      models[item.id] = {
        ...data,
        ...item,
      };
    }
  }

  return models;
}
