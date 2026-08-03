import { getModels } from "./models";
import { ForgeNotReady } from "./errors";

type ForgeStatus = {
  ok: boolean;
  version: string;
  signedIn: boolean;
};

type ForgeEnvironment = {
  version: string;
  signedIn: boolean;
  opencodeBin: string;
  workspaceCwd: string;
  env: {
    FORGE_MCP_URL: string;
    FORGE_MCP_TOKEN: string;
    FORGE_OPENROUTER_BROKER_BASE_URL: string;
    FORGE_SUPABASE_ACCESS_TOKEN: string;
    FORGE_OPENCODE_MODEL_CATALOG_JSON: string;
  };
};

type ForgeModel = {
  id: string;
  name: string;
  isDefault: boolean;
  cost: { input: number; output: number; cache_read: number };
  limit: { context: number; output: number };
};

export class Forge {
  constructor(
    public readonly uri: string,
    public readonly token: string,
  ) {}

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
    return await this.request<ForgeStatus>("/v1/ping");
  }

  async env() {
    return await this.request<ForgeEnvironment>("/v1/env");
  }

  async provider() {
    try {
      const { env } = await this.env();
      const { models } = JSON.parse(env.FORGE_OPENCODE_MODEL_CATALOG_JSON) as {
        models: ForgeModel[];
      };

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
        models: await getModels(
          models.map((model) => ({
            id: model.id,
            name: model.name,
            cost: model.cost,
            limit: model.limit,
          })),
        ),
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
