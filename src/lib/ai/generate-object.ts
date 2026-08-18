import { APICallError, generateObject } from "ai";
import type { z } from "zod";
import { getModel, AiServiceError } from "./provider";

/**
 * Wraps AI SDK's generateObject with retries (backoff between attempts) and
 * a controlled error on repeated failure — per spec, AI structured output is
 * never trusted blindly and a malformed/failed response never crashes the
 * request, it surfaces as a clear AiServiceError instead.
 *
 * `maxRetries: 1` caps the SDK's own internal retries so our outer loop
 * (with backoff) controls pacing instead of two retry layers firing a burst
 * of near-simultaneous calls at an already-overloaded model.
 */

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter: ~500ms, ~1s, ... */
function backoffDelay(attempt: number) {
  const exponential = BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponential + jitter;
}

/** True for transient "the model/provider is overloaded right now" errors, as opposed to malformed output or a real config/auth problem. */
function isOverloadedError(err: unknown): boolean {
  if (APICallError.isInstance(err)) {
    if (err.statusCode === 503 || err.statusCode === 429) return true;
  }
  const message = (err as Error)?.message ?? "";
  return /high demand|overloaded/i.test(message);
}

export async function safeGenerateObject<Output>(params: {
  schema: z.ZodType<Output>;
  system: string;
  prompt: string;
}): Promise<Output> {
  const { schema, system, prompt } = params;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { object } = await generateObject({
        model: getModel(),
        schema,
        system,
        prompt,
        maxRetries: 1,
      });
      return object as Output;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        if (isOverloadedError(err)) {
          throw new AiServiceError(
            "El servicio de IA está temporalmente saturado. Espera unos segundos y vuelve a intentarlo.",
          );
        }
        throw new AiServiceError(
          `The AI returned an unexpected response. Please try again. (${(err as Error).message})`,
        );
      }
      await sleep(backoffDelay(attempt));
    }
  }
  // Unreachable, but keeps TypeScript happy.
  throw new AiServiceError("The AI returned an unexpected response.");
}
