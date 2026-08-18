import { z } from "zod";

/**
 * Server-only environment validation. Import this instead of reading
 * `process.env` directly so misconfiguration fails fast with a clear error
 * instead of surfacing as a confusing runtime bug later.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Google is the default: it has a real free tier (no card required), which
  // matters for a competition demo multiple people will open concurrently.
  // OpenAI stays fully supported — set AI_PROVIDER=openai to switch.
  // Groq is a free-tier text-generation option with much higher rate limits
  // than Google's free tier; Groq has no embeddings API, so when
  // AI_PROVIDER=groq, embeddings still come from Google — GOOGLE_API_KEY must
  // also be set in that case (see hasAiCredentials below).
  AI_PROVIDER: z.enum(["google", "openai", "groq"]).default("google"),

  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_MODEL: z.string().default("gemini-flash-latest"),
  GOOGLE_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  // --- Groq (text generation only — see AI_PROVIDER comment above) ---
  // Get a free key at https://console.groq.com/keys (no billing required).
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),

  // Both providers are asked to output this many dimensions (Google via
  // outputDimensionality, OpenAI via its `dimensions` param) so the
  // pgvector column stays a single fixed size regardless of provider.
  EMBEDDING_DIM: z.coerce.number().int().positive().default(768),

  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(20),

  // "local" writes to STORAGE_DIR on disk (dev). "blob" uses Vercel Blob —
  // required in production since serverless has no persistent filesystem.
  // BLOB_READ_WRITE_TOKEN is injected automatically once a Blob store is
  // connected in the Vercel dashboard.
  STORAGE_DRIVER: z.enum(["local", "blob"]).default("local"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  STORAGE_DIR: z.string().default("./storage"),
  DEMO_USER_ID: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Must be a UUID")
    .default("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Lazily validated so `next build` (which loads modules without env in some phases) never crashes eagerly. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${message}`);
  }
  cached = parsed.data;
  return cached;
}

/** True once the active provider's API key is configured; used to give a controlled error instead of a crash. */
export function hasAiCredentials(): boolean {
  const env = getEnv();
  switch (env.AI_PROVIDER) {
    case "google":
      return Boolean(env.GOOGLE_API_KEY);
    case "openai":
      return Boolean(env.OPENAI_API_KEY);
    case "groq":
      // Groq handles text generation; embeddings still go through Google.
      return Boolean(env.GROQ_API_KEY) && Boolean(env.GOOGLE_API_KEY);
  }
}
