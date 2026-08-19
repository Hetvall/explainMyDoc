<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ExplainMyDoc — Agent Notes

ExplainMyDoc turns an uploaded PDF/TXT into a structured summary, a grounded RAG chat, on-demand
passage explanations, a quiz, flashcards, and a day-by-day study plan — everything generated from
and cited back to that specific document. See `README.md` for the full product/architecture writeup;
this file is the quick-reference for agents working in the codebase.

## Commands
- `npm run dev` — start the dev server (Turbopack)
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` / `npm run typecheck` — ESLint / `tsc --noEmit`
- `docker compose up -d` — start local Postgres + pgvector (see `docker-compose.yml`; maps to host port **5434**, not 5432, to avoid clashing with other local Postgres containers)
- `npm run db:generate` — generate a Drizzle migration from `src/lib/db/schema.ts`
- `npm run db:migrate` — apply migrations (also ensures the `vector` extension exists)
- `npm run db:seed` — seed the single demo user
- `npm run db:studio` — Drizzle Studio

## Stack
Next.js 16 (App Router, Turbopack) · TypeScript · React 19 · Tailwind CSS v4 · Radix UI primitives +
`lucide-react` · PostgreSQL 17 + pgvector (HNSW/cosine) · Drizzle ORM · Vercel AI SDK (`ai`,
`@ai-sdk/google`, `@ai-sdk/openai`, Groq via OpenAI-compatible endpoint) · Zod · `unpdf` (PDF text
extraction) · `@vercel/blob` (optional production storage driver).

## Architecture map
- `src/lib/db/schema.ts` — Drizzle schema (single source of truth for the DB shape): `users`,
  `documents`, `document_chunks` (pgvector), `summaries`, `conversations`/`messages`, `quizzes`/
  `quiz_questions`/`quiz_attempts`, `flashcards`, `study_plans`.
- `src/lib/documents/` — processing pipeline: `extract.ts` → `clean.ts` → `chunk.ts` → `embed.ts`, orchestrated by `process.ts`
- `src/lib/ai/` — provider abstraction (`provider.ts`, supports `google`/`openai`/`groq` via
  `AI_PROVIDER`) + all AI service functions (`summary.ts`, `chat.ts`, `explain.ts`, `quiz.ts`,
  `flashcards.ts`, `study-plan.ts`) + `retrieval.ts` (pgvector similarity search) + `schemas.ts`
  (Zod schemas for structured output) + `generate-object.ts` (`safeGenerateObject` wrapper) +
  `context.ts` (whole-document context assembly with a safe char-limit truncation).
- `src/lib/storage/` — `StorageProvider` abstraction (`save`/`read`/`delete`); local filesystem or
  Vercel Blob, selected at runtime via `STORAGE_DRIVER` (`local` default, `blob` for serverless
  deploys where the filesystem is ephemeral).
- `src/lib/auth.ts` — single seeded demo user id; the one place to swap in real auth later
- `src/lib/api/guard.ts` — `getOwnedDocument`/`requireProcessedDocument`, the ownership + processed-status gate every document-scoped route uses
- `src/app/api/documents/` — all document-scoped route handlers (`[id]/chat`, `/explain`,
  `/summary`, `/quiz(+/[quizId]/attempt)`, `/flashcards(+/[cardId])`, `/study-plan`), each guarded
  by `src/lib/api/guard.ts`
- `src/app/(app)/` — dashboard and document-detail pages (App Router route group)
- `src/components/documents/` — the per-feature panels (summary, chat, explain menu, quiz,
  flashcards, study plan, processing status) that make up the document page
- `.claude/agents/code-check.md` — project-specific subagent that audits the codebase against
  these conventions (ownership guard, uuid validation, Zod-validated AI output, server/client
  boundary) and reports/fixes findings by severity

## Conventions
- Every document-scoped query/route must go through `getOwnedDocument`/`requireProcessedDocument` — never trust a client-supplied id or user id.
- AI calls only happen server-side (route handlers / `lib/ai`). Client components only ever `fetch()` an API route.
- Any id coming from a URL param that hits a `uuid` column must be validated with `isValidUuid()` first (Postgres throws, not "no rows", on a malformed uuid cast) — see `src/lib/db/queries.ts`.
- Structured AI output is always validated with a Zod schema via `safeGenerateObject` — never trust raw model JSON.
- AI provider access always goes through `lib/ai/provider.ts` (`getModel()`/`getEmbeddingModel()`); file storage always goes through the `StorageProvider` interface in `lib/storage/` — never call a provider SDK or `fs`/disk paths directly from elsewhere.
- All providers are forced to emit `EMBEDDING_DIM` (default 768) dimensions so the pgvector column stays a fixed size regardless of which `AI_PROVIDER` generated a given document's embeddings.
- AI generation routes set `maxDuration` for longer-running model calls on serverless deploys — keep that in mind when adding new AI route handlers.
- Every `lib/ai/*.ts` system prompt instructs the model to detect the document's language and respond in it (never default to English) — keep new AI features consistent with this when adding prompts.
- Client components must not render a bare text expression as a direct child of a Radix/React-managed node that can be unmounted (Select items, toast titles/descriptions, reader paragraphs, etc.) — wrap it in its own `<span>`. Browser auto-translation rewrites text nodes in place, and React/Radix trying to remove that mutated node on unmount throws `removeChild` errors; see `src/components/ui/select.tsx` for the full writeup.
- `next.config.ts` derives `experimental.proxyClientMaxBodySize` from `MAX_FILE_SIZE_MB` — Next's proxy layer caps request bodies at 10MB by default, ahead of and independent from any in-route size check, so raising an upload limit means changing both `MAX_FILE_SIZE_MB` and confirming this derived value still has headroom.

