import { z } from "zod";

/**
 * Server-side environment, validated once. Defaults match `supabase start`
 * on a developer machine, so a clean clone runs without a .env file.
 */
const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
  JOBS_POLL_SECONDS: z.coerce.number().int().positive().default(15),
});

export type ServerEnv = z.infer<typeof schema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
