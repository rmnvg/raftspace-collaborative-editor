import "server-only";
import { z } from "zod";

// Only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are safe to
// expose to the client. SUPABASE_SERVICE_ROLE_KEY must never be prefixed
// with NEXT_PUBLIC_ or read outside this server-only module.
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ required_error: "NEXT_PUBLIC_SUPABASE_URL is required" })
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ required_error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ required_error: "SUPABASE_SERVICE_ROLE_KEY is required" })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing Supabase environment configuration:\n${details}\n\n` +
        "Copy .env.example to .env.local and fill in your Supabase project's " +
        "URL, anon key, and service role key.",
    );
  }

  cached = parsed.data;
  return cached;
}
