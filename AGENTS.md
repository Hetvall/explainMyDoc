<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ExplainMyDoc — Agent Notes

## Commands
- `npm run dev` — start the dev server (Turbopack)
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` / `npm run typecheck` — ESLint / `tsc --noEmit`
- `docker compose up -d` — start local Postgres + pgvector (see `docker-compose.yml`; maps to host port **5434**, not 5432, to avoid clashing with other local Postgres containers)
- `npm run db:generate` — generate a Drizzle migration from `src/lib/db/schema.ts`
- `npm run db:migrate` — apply migrations (also ensures the `vector` extension exists)
- `npm run db:seed` — seed the single demo user
- `npm run db:studio` — Drizzle Studio

## Architecture map
- `src/lib/db/schema.ts` — Drizzle schema (single source of truth for the DB shape)
- `src/lib/documents/` — processing pipeline: `extract.ts` → `clean.ts` → `chunk.ts` → `embed.ts`, orchestrated by `process.ts`
- `src/lib/ai/` — provider abstraction (`provider.ts`) + all AI service functions (summary, chat/RAG, explain, quiz, flashcards, study plan) + `retrieval.ts` (pgvector similarity search) + `schemas.ts` (Zod schemas for structured output)
- `src/lib/storage/` — `StorageProvider` abstraction; local filesystem implementation for the MVP
- `src/lib/auth.ts` — single seeded demo user id; the one place to swap in real auth later
- `src/app/api/documents/` — all document-scoped route handlers, each guarded by `src/lib/api/guard.ts` (ownership + processed-status check)

## Conventions
- Every document-scoped query/route must go through `getOwnedDocument`/`requireProcessedDocument` — never trust a client-supplied id or user id.
- AI calls only happen server-side (route handlers / `lib/ai`). Client components only ever `fetch()` an API route.
- Any id coming from a URL param that hits a `uuid` column must be validated with `isValidUuid()` first (Postgres throws, not "no rows", on a malformed uuid cast) — see `src/lib/db/queries.ts`.
- Structured AI output is always validated with a Zod schema via `safeGenerateObject` — never trust raw model JSON.

