export type JSONSchema = {
  type?: string | readonly string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema | readonly JSONSchema[];
  additionalProperties?: boolean | JSONSchema;
};

interface OrderBySchemaOptions {
  unknownProperties?: "preserve" | "alphabetic" | "remove";
}

export function sortJsonBySchema<T>(
  value: T,
  schema: JSONSchema,
  options: OrderBySchemaOptions = {},
): T {
  const { unknownProperties = "preserve" } = options;

  if (Array.isArray(value)) {
    const items = schema.items;

    if (isSchemaArray(items)) {
      return value.map((item, index) => sortJsonBySchema(item, items[index] ?? {}, options)) as T;
    }

    const itemSchema: JSONSchema = items ?? {};

    return value.map((item) => sortJsonBySchema(item, itemSchema, options)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const properties = schema.properties ?? {};
  const result: Record<string, unknown> = {};

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (!Object.hasOwn(source, key)) {
      continue;
    }

    result[key] = sortJsonBySchema(source[key], propertySchema, options);
  }

  let unknownKeys = Object.keys(source).filter((key) => !Object.hasOwn(properties, key));

  if (unknownProperties === "remove") {
    unknownKeys = [];
  } else if (unknownProperties === "alphabetic") {
    unknownKeys.sort();
  }

  const additionalSchema: JSONSchema =
    typeof schema.additionalProperties === "object" ? schema.additionalProperties : {};

  for (const key of unknownKeys) {
    result[key] = sortJsonBySchema(source[key], additionalSchema, options);
  }

  return result as T;
}

function isSchemaArray(
  value: JSONSchema | readonly JSONSchema[] | undefined,
): value is readonly JSONSchema[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
