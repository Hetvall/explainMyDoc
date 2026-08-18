# ExplainMyDoc

**Understand any document in minutes.**

Upload a PDF or text file and ExplainMyDoc turns it into something you can actually use: a
structured summary, a grounded Q&A chat, on-demand explanations of any passage, a quiz, flashcards,
and a day-by-day study plan — all generated from *that specific document*, not generic knowledge.

---

## The problem

Everyone has a backlog of documents they need to understand but don't have time to fully read:
a 40-page report before a meeting, a research paper for a class, a contract before signing it, a
manual before using a tool. Skimming loses nuance. Asking a general-purpose chatbot means
re-explaining context every time and getting answers that may not actually be grounded in the
document at all.

ExplainMyDoc's angle: **the document is the product, not a prompt.** Every feature — summary,
chat, explanations, quizzes, flashcards — is built on top of the same processing pipeline and is
explicitly grounded in the uploaded file, with source page citations, and an honest "I couldn't
find that in this document" when it doesn't know. The core loop is:

```
Upload → Understand → Ask → Practice → Review → Understand better
```

## Features

- **Upload** — drag & drop or file picker, PDF/TXT, with progress, validation, and clear error
  states (file too large, wrong type, empty file, extraction failure).
- **Processing pipeline** — extract → clean → chunk → embed → store in Postgres/pgvector, with the
  document's status (`uploaded → processing → processed/failed`) always visible and never stuck.
  Kicked off via Next.js `after()` right after upload so it survives on serverless deploys without
  blocking the response.
- **AI summary** — TL;DR, key points, important concepts, action items, "who should care", and an
  estimated reading time — generated once and cached.
- **Explain this** — select any text in the document and get it explained *Simple / Detailed /
  Like I'm 10 / with an Example / with an Analogy*, grounded in the surrounding document context.
- **Chat with your document** — RAG-based Q&A. Every answer is retrieved from the document via
  pgvector similarity search, with page citations, and a plain refusal when the document doesn't
  contain the answer.
- **Quiz generator** — 5/10/15 multiple-choice questions at Easy/Medium/Hard, with explanations,
  scored results, and flagged weak areas.
- **Flashcards** — auto-generated front/back cards with Again/Hard/Good/Easy review tracking
  (persisted; spaced-repetition scheduling is a natural next step, see Limitations).
- **Study plan** — a practical day-by-day plan generated from a goal, available days, and hours/day.
- **Dashboard** — recent documents, processing status, quiz/flashcard stats, quick actions.

## Architecture

```
Next.js 16 (App Router, TS, React 19) + Tailwind v4
        │
  Route Handlers (server-only) ── AI keys and DB access never touch the client
        │
  ┌─────┴──────────────┬───────────────────┬─────────────────────┐
  lib/documents/        lib/ai/             lib/storage/           lib/db/
  extract → clean →     provider.ts (google/ StorageProvider       Drizzle schema +
  chunk → embed         openai/groq model    interface; local FS   ownership-scoped
  (process.ts orchestrates)  abstraction) +   or Vercel Blob         queries
                         summary/chat/                              (queries.ts)
                         explain/quiz/
                         flashcards/study-plan
                         + retrieval.ts (RAG)
                         + generate-object.ts (Zod-validated output)
        │
  PostgreSQL 17 + pgvector (HNSW index, cosine similarity)
```

**Why this shape:**
- **Provider abstraction** (`lib/ai/provider.ts`) — every AI call goes through `getModel()` /
  `getEmbeddingModel()`. Swapping Google/OpenAI/Groq for another provider means changing one file.
- **Storage abstraction** (`lib/storage/`) — raw files never sit in Postgres; a `StorageProvider`
  interface makes it a one-file change to swap providers. Local disk today for dev, and Vercel
  Blob (`STORAGE_DRIVER=blob`) for production, since serverless filesystems are ephemeral.
- **No-login MVP, isolated** (`lib/auth.ts`) — a single seeded demo user, so the demo flow is
  friction-free, but every call site already asks `getCurrentUserId()` instead of trusting a
  client-supplied id, so real auth can slot in without touching business logic.
- **Ownership guard** (`lib/api/guard.ts`) — every document-scoped API route checks the document
  belongs to the current user and has finished processing before doing anything else.

## How RAG works here

```
Upload → extract text (unpdf for PDF, direct read for TXT)
       → clean (normalize whitespace, fix hyphenation)
       → chunk (~1000 chars, 150 char overlap, sentence-aware, keeps page number + chunk index)
       → embed each chunk (Gemini `gemini-embedding-001` by default, 768 dims)
       → store in `document_chunks.embedding` (pgvector column, HNSW cosine index)

User question → embed the question → pgvector cosine similarity search, scoped to that
              document → top-K relevant chunks (with a minimum relevance threshold — low-similarity
              results are treated as "not found" rather than forced into an answer)
              → chunks + question → LLM, instructed to answer *only* from the given context
              → answer + page citations
```

The same retrieval function (`lib/ai/retrieval.ts`) backs both the document chat and "Explain
this" (which also pulls a few relevant chunks around the selected text for grounding). Summary,
quiz, and flashcard generation instead read the full cleaned document text directly (no retrieval
needed — they operate on the whole document), capped to a safe character limit for very long files.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · React 19 · Tailwind CSS v4 · PostgreSQL 17 +
pgvector · Drizzle ORM · Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`, Groq via its
OpenAI-compatible endpoint) · Zod · `unpdf` (PDF text extraction) · Radix UI primitives ·
lucide-react · `@vercel/blob` (optional production storage driver).

## AI provider

ExplainMyDoc supports three providers behind the same abstraction (`lib/ai/provider.ts`), selected
with `AI_PROVIDER`:

- **Google Gemini (default)** — has a real free tier with no card required, via
  [Google AI Studio](https://aistudio.google.com/apikey). This is the default specifically because
  a competition demo may be opened by several people at once, and a free tier removes billing risk
  entirely.
- **OpenAI** — fully supported, set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY` (requires a
  funded/billed account).
- **Groq** — set `AI_PROVIDER=groq` and provide `GROQ_API_KEY` for text generation only, via
  Groq's OpenAI-compatible Chat Completions endpoint (much higher free-tier rate limits than
  Google's, useful if Gemini's free-tier limit — as low as 20 req/min on some models — gets hit
  under real demo traffic). Groq has no embeddings API, so `GOOGLE_API_KEY` must still be set in
  this mode — embeddings always run through Google regardless of `AI_PROVIDER`.

All providers are asked to emit the same `EMBEDDING_DIM` (768) for their embeddings, so the
pgvector column has one fixed dimension regardless of which provider generated a given document's
embeddings — switching providers doesn't require a schema change.

## Environment variables

See [`.env.example`](.env.example) for the full list with descriptions. Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AI_PROVIDER` | `google` (default), `openai`, or `groq` |
| `GOOGLE_API_KEY` | Required when `AI_PROVIDER=google` (and always, when `AI_PROVIDER=groq`, since embeddings run through Google) — free key at aistudio.google.com/apikey |
| `GOOGLE_MODEL` | Chat/completion model (default `gemini-flash-latest`) |
| `GOOGLE_EMBEDDING_MODEL` | Embedding model (default `gemini-embedding-001`) |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | Chat/completion model (default `gpt-4o-mini`) |
| `OPENAI_EMBEDDING_MODEL` | Embedding model (default `text-embedding-3-small`) |
| `GROQ_API_KEY` | Required when `AI_PROVIDER=groq` — free key at console.groq.com/keys |
| `GROQ_MODEL` | Chat/completion model (default `openai/gpt-oss-120b`) |
| `EMBEDDING_DIM` | Output dimension all providers are forced to (default `768`) |
| `MAX_FILE_SIZE_MB` | Upload size limit |
| `STORAGE_DRIVER` | `local` (default, dev) or `blob` (Vercel Blob, for serverless deploys) |
| `STORAGE_DIR` | Local filesystem directory for uploaded files (only used when `STORAGE_DRIVER=local`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (only needed when `STORAGE_DRIVER=blob`; Vercel injects it automatically once a Blob store is connected) |
| `DEMO_USER_ID` | Fixed user id for the no-login MVP |

## Local setup

Prerequisites: Node.js ≥ 20.9 (Next.js 16 requirement), Docker (for Postgres + pgvector), and a
free [Google AI Studio](https://aistudio.google.com/apikey) API key (or an OpenAI key, see above).

```bash
npm install
cp .env.example .env.local     # then fill in GOOGLE_API_KEY (or switch to OpenAI, see above)
docker compose up -d           # starts Postgres+pgvector on localhost:5434
npm run db:migrate             # creates the schema (and the `vector` extension)
npm run db:seed                # seeds the single demo user
npm run dev                    # http://localhost:3000
```

### Database setup & migrations

The schema lives in `src/lib/db/schema.ts` (Drizzle). After changing it:

```bash
npm run db:generate   # writes a new SQL migration into drizzle/
npm run db:migrate     # applies pending migrations (idempotent)
```

`npm run db:studio` opens Drizzle Studio against the local database if you want to inspect data
directly.

## Running the app / demo flow

```
Landing → Upload a PDF → Processing (extract/clean/chunk/embed) → Summary
        → Ask a question in Chat → Select text → Explain this → Generate a quiz → See the result
```

The whole flow is designed to be demoable end-to-end in under two minutes from an empty dashboard.

## Testing

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build        # production build (also runs the TypeScript check)
```

There's no automated test suite yet (see Limitations) — the flows above were verified manually
end-to-end, including the error paths (invalid file type, empty file, oversized file, malformed
document id, AI quota/failure) using `curl` against the running dev server.

## Deployment

The app can be deployed either way:

**Serverless (Vercel)** — document processing after upload uses Next.js's `after()` (backed by
Vercel's `waitUntil` in production, see `src/app/api/documents/route.ts`), which keeps the
function invocation alive until `processDocument()` finishes instead of relying on a persistent
process. AI route handlers set `maxDuration = 60` to give processing/generation enough time within
a serverless function's lifetime.

1. Provision Postgres with the `pgvector` extension available (e.g. Neon, Supabase, or any managed
   Postgres that supports installing extensions).
2. Set `STORAGE_DRIVER=blob` and connect a Vercel Blob store (`BLOB_READ_WRITE_TOKEN` is injected
   automatically) — Vercel's filesystem is read-only/ephemeral, so `STORAGE_DRIVER=local` won't work here.
3. Set the remaining environment variables from `.env.example`.
4. Run `npm run db:migrate && npm run db:seed` against that database (locally, or as a one-off
   deploy step/CI job with `DATABASE_URL` pointed at production).
5. Deploy — `next build` runs as usual.

**Self-hosted** (`next build && next start`) against a Postgres+pgvector instance — same steps as
above, except `STORAGE_DRIVER=local` works fine (point `STORAGE_DIR` at a persistent volume), since
the Node process stays alive between requests.

1. Provision Postgres with the `pgvector` extension available (e.g. a small VM/Docker host).
2. Set the environment variables from `.env.example`.
3. Run `npm run db:migrate && npm run db:seed` against that database.
4. `npm run build && npm run start` (or containerize with a Dockerfile using the same steps).
5. Point `STORAGE_DIR` at a persistent volume (or use `STORAGE_DRIVER=blob` here too, if preferred).

## Known limitations

- **No real authentication.** Single seeded demo user, by design for a frictionless demo. Isolated
  behind `lib/auth.ts` so real auth (e.g. a session-based provider) can be added without touching
  business logic.
- **Background processing has no retry/queue.** `after()` keeps the serverless invocation alive
  long enough for `processDocument()` to run to a terminal status, but there's no retry-on-failure
  or durable job queue — a crash mid-processing leaves the document `failed` until re-uploaded.
- **No spaced-repetition scheduling yet.** Flashcard ratings (Again/Hard/Good/Easy) are recorded,
  but the next-review date isn't computed from them yet — `flashcards.difficulty` /
  `lastReviewedAt` / `reviewCount` are already in the schema as the extension point.
- **DOCX isn't supported yet.** The extraction layer (`lib/documents/extract.ts`) is
  format-agnostic downstream of `{ pages, fullText }`, so adding a DOCX extractor (e.g. `mammoth`)
  is a self-contained addition.
- **No automated test suite.** Verified manually end-to-end (including error paths); unit/e2e
  tests would be the next investment.
- **Very large documents are truncated** for whole-document AI tasks (summary/quiz/flashcards/study
  plan) at a safe character limit to protect the model's context window — RAG chat and "Explain
  this" aren't affected, since they only ever pull relevant chunks.

## Future improvements

- Real authentication + multi-user support.
- A proper background job queue for processing (also unlocks retry-on-failure).
- Spaced-repetition scheduling for flashcards.
- DOCX and other format support.
- Streaming chat responses token-by-token.
- Automated test suite (unit tests for the chunking/RAG logic, e2e for the core flow).
