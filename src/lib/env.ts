import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_INTERNAL_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
