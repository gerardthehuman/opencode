import { z } from "zod";

export const ForgeOptions = z.object({
  model: z.string().optional(),
  small_model: z.string().optional(),
  agent: z
    .record(
      z.string(),
      z.object({
        model: z.string(),
        variant: z.string().optional(),
        mode: z.enum(["primary", "subagent", "all"]).optional(),
        prompt: z.string().nullable().optional(),
        disable: z.boolean().optional().optional(),
      }),
    )
    .optional(),
});

export type ForgeOptions = z.infer<typeof ForgeOptions>;
