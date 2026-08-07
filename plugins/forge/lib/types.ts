import type { Config as KiloCodeConfig } from "@kilocode/plugin";
import type { Config as OpenCodeConfig } from "@opencode-ai/plugin";

type ValueOf<T> = T[keyof T];

export type Config = (KiloCodeConfig | OpenCodeConfig) & {
  skills?: {
    paths?: string[];
  };
};

export type Agent = ValueOf<NonNullable<Config["agent"]>>;
export type Provider = ValueOf<NonNullable<Config["provider"]>>;
export type ProviderModel = ValueOf<NonNullable<Provider["models"]>>;
