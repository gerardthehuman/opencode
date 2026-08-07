import { glob } from "globlin";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { z } from "zod";

import type { Agent, Provider, ProviderModel } from "./types";

import { ForgeNotReady, ForgeError } from "./errors";
import { getModels } from "./models";

const ForgeStatus = z.looseObject({
  ok: z.boolean(),
  version: z.string(),
  signedIn: z.boolean(),
});
type ForgeStatus = z.infer<typeof ForgeStatus>;

const ForgeEnvironment = z.looseObject({
  signedIn: z.boolean(),
  opencodeBin: z.string(),
  env: z.looseObject({
    FORGE_MCP_URL: z.string(),
    FORGE_MCP_TOKEN: z.string(),
    FORGE_OPENROUTER_BROKER_BASE_URL: z.string(),
    FORGE_SUPABASE_ACCESS_TOKEN: z.string(),
    FORGE_OPENCODE_MODEL_CATALOG_JSON: z.string(),
    FORGE_TERMINAL_BOOTSTRAP_DIR: z.string(),
  }),
});
type ForgeEnvironment = z.infer<typeof ForgeEnvironment>;

const ForgeCatalog = z.looseObject({
  source: z.string(),
  defaultModelId: z.string(),
  models: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      isDefault: z.boolean(),
      limit: z.looseObject({
        context: z.number(),
        output: z.number(),
      }),
    }),
  ),
  agents: z.array(
    z.looseObject({
      role: z.string(),
      model: z.string().optional(),
      reasoningEffort: z.string().optional(),
    }),
  ),
});
type ForgeCatalog = z.infer<typeof ForgeCatalog>;

export class Forge {
  private environment?: ForgeEnvironment;

  constructor(
    public readonly path: string,
    public readonly uri: string,
    public readonly token: string,
  ) {}

  get directory() {
    return dirname(this.path);
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.uri}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.token}`,
      },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new ForgeNotReady(
        `Forge is not reachable. Request to ${path} failed with status ${response.status} ${response.statusText}.`,
      );
    }

    return response.json() as Promise<T>;
  }

  async ping() {
    const response = await this.request("/v1/ping");
    const { success, data, error } = ForgeStatus.safeParse(response);

    if (!success) {
      throw new ForgeError(`Forge ping response is malformed. ${error?.message}`);
    }

    return data;
  }

  async env(fresh = false) {
    if (!this.environment || fresh) {
      const response = await this.request("/v1/env");
      const { success, data, error } = ForgeEnvironment.safeParse(response);

      if (!success) {
        throw new ForgeError(`Forge environment is malformed. ${error?.message}`);
      }

      this.environment = data;
    }

    return this.environment;
  }

  async catalog() {
    try {
      const { env } = await this.env();
      const { success, data, error } = ForgeCatalog.safeParse(
        JSON.parse(env.FORGE_OPENCODE_MODEL_CATALOG_JSON),
      );

      if (!success) {
        throw new ForgeError(`Forge catalog is malformed. ${error?.message}`);
      }

      return data;
    } catch (error) {
      return undefined;
    }
  }

  async models(): Promise<Record<string, ProviderModel>> {
    const catalog = await this.catalog();

    return await getModels(
      (catalog?.models ?? []).map((model) => ({
        id: model.id,
        name: model.name,
        limit: model.limit,
      })),
    );
  }

  async agents(): Promise<Record<string, Agent>> {
    const { env } = await this.env();
    const bootstrap =
      env?.FORGE_TERMINAL_BOOTSTRAP_DIR || join(this.directory, "terminal-bootstrap");
    const source = join(bootstrap, "opencode-agents");
    const catalog = await this.catalog();
    const files = await glob("*.md", { cwd: source, absolute: true });
    const agents: Record<string, Agent> = {};

    await Promise.all(
      files.map(async (file) => {
        try {
          const name = basename(file, ".md");
          const contents = await readFile(file, "utf-8");
          const { data, content: prompt } = matter(contents);
          const options = (catalog?.agents ?? []).find((agent) => agent.role === name);

          agents[name] = {
            name,
            model: options?.model ? `forge/${options.model}` : undefined,
            variant: options?.reasoningEffort,
            ...(data as Omit<Agent, "name" | "prompt">),
            prompt: prompt.trim(),
          };
        } catch (_) {
          // Do not block if an agent file is malformed
        }
      }),
    );

    return agents;
  }

  async provider(): Promise<Provider | undefined> {
    try {
      const { env } = await this.env();
      const models = await this.models();

      if (Object.keys(models).length === 0) {
        throw new ForgeNotReady(`No models available in the Forge catalog.`);
      }

      return {
        name: "Forge",
        npm: "@openrouter/ai-sdk-provider",
        api: env.FORGE_OPENROUTER_BROKER_BASE_URL,
        options: {
          baseURL: env.FORGE_OPENROUTER_BROKER_BASE_URL,
          apiKey: env.FORGE_SUPABASE_ACCESS_TOKEN,
          headers: {
            "HTTP-Referer": "https://forge.humanforce.com",
            "X-Title": "Forge OpenCode",
          },
        },
        models,
      };
    } catch (error) {
      return undefined;
    }
  }

  async mcp() {
    try {
      const { env } = await this.env();

      return {
        type: "remote" as const,
        url: env.FORGE_MCP_URL,
        headers: {
          Authorization: `Bearer ${env.FORGE_MCP_TOKEN}`,
        },
      };
    } catch (error) {
      return undefined;
    }
  }
}
