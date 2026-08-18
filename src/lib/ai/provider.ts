import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getEnv } from "@/lib/env";

/**
 * Provider abstraction: every other AI call in the app goes through
 * `getModel()` / `getEmbeddingModel()` instead of importing a provider SDK
 * directly. Swapping providers (or adding a new one) means changing this
 * file only. Google is the default (real free tier, good for a demo many
 * people open at once); OpenAI is fully supported via AI_PROVIDER=openai.
 *
 * AI_PROVIDER=groq uses Groq for text generation only (much higher free-tier
 * rate limits than Google's), via its OpenAI-compatible endpoint — no
 * separate SDK needed. Groq has no embeddings API, so embeddings always fall
 * back to Google in that mode; GOOGLE_API_KEY must still be set.
 *
 * All providers are asked to emit EMBEDDING_DIM-dimension vectors so the
 * pgvector column (see lib/db/schema.ts) stays one fixed size no matter
 * which provider generated the embedding.
 */

let openaiClient: ReturnType<typeof createOpenAI> | null = null;
let groqClient: ReturnType<typeof createOpenAI> | null = null;
let googleClient: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getOpenAI() {
  if (!openaiClient) {
    const { OPENAI_API_KEY } = getEnv();
    openaiClient = createOpenAI({ apiKey: OPENAI_API_KEY ?? "" });
  }
  return openaiClient;
}

function getGroq() {
  if (!groqClient) {
    const { GROQ_API_KEY } = getEnv();
    groqClient = createOpenAI({
      apiKey: GROQ_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groqClient;
}

/**
 * Groq's endpoint only implements the OpenAI Chat Completions API, not the
 * newer Responses API that `createOpenAI(...)(modelId)` defaults to — that
 * default 404s against Groq. `.chat(modelId)` forces Chat Completions.
 */
function groqModel(modelId: string) {
  return getGroq().chat(modelId);
}

function getGoogle() {
  if (!googleClient) {
    const { GOOGLE_API_KEY } = getEnv();
    googleClient = createGoogleGenerativeAI({ apiKey: GOOGLE_API_KEY ?? "" });
  }
  return googleClient;
}

export function getModel() {
  const { AI_PROVIDER, OPENAI_MODEL, GOOGLE_MODEL, GROQ_MODEL } = getEnv();
  switch (AI_PROVIDER) {
    case "google":
      return getGoogle()(GOOGLE_MODEL);
    case "openai":
      return getOpenAI()(OPENAI_MODEL);
    case "groq":
      return groqModel(GROQ_MODEL);
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
  }
}

export function getEmbeddingModel() {
  const { AI_PROVIDER, OPENAI_EMBEDDING_MODEL, GOOGLE_EMBEDDING_MODEL } = getEnv();
  switch (AI_PROVIDER) {
    case "google":
    case "groq":
      // Groq has no embeddings API — reuse Google's for that half of the pipeline.
      return getGoogle().textEmbeddingModel(GOOGLE_EMBEDDING_MODEL);
    case "openai":
      return getOpenAI().textEmbeddingModel(OPENAI_EMBEDDING_MODEL);
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
  }
}

/**
 * Provider-specific per-call options that force the embedding output to a
 * fixed EMBEDDING_DIM regardless of provider, so the pgvector column can
 * stay one fixed dimension. Spread into `embed()`/`embedMany()`'s
 * `providerOptions`.
 */
export function getEmbeddingProviderOptions(): Record<string, Record<string, number>> {
  const { AI_PROVIDER, EMBEDDING_DIM } = getEnv();
  switch (AI_PROVIDER) {
    case "google":
    case "groq":
      // Groq embeddings always run through Google — see getEmbeddingModel above.
      return { google: { outputDimensionality: EMBEDDING_DIM } };
    case "openai":
      return { openai: { dimensions: EMBEDDING_DIM } };
    default:
      return {};
  }
}

/** Thrown by AI service functions on missing credentials or unrecoverable model errors — always caught and surfaced as a controlled error, never a raw crash. */
export class AiServiceError extends Error {}
