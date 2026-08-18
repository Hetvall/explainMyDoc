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
  extract → clean →     provider.ts (model  StorageProvider        Drizzle schema +
  chunk → embed         abstraction) +      interface; local FS    ownership-scoped
  (process.ts orchestrates)  summary/chat/  implementation today   queries
                         explain/quiz/                              (queries.ts)
                         flashcards/study-plan
                         + retrieval.ts (RAG)
        │
  PostgreSQL 17 + pgvector (HNSW index, cosine similarity)
```

**Why this shape:**
- **Provider abstraction** (`lib/ai/provider.ts`) — every AI call goes through `getModel()` /
  `getEmbeddingModel()`. Swapping OpenAI for another provider means changing one file.
- **Storage abstraction** (`lib/storage/`) — raw files never sit in Postgres; a `StorageProvider`
  interface makes it a one-file change to swap local disk for S3/Vercel Blob/Supabase later.
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

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS v4 · PostgreSQL 17 + pgvector ·
Drizzle ORM · AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`) · Zod · `unpdf` (PDF text
extraction) · Radix UI primitives · lucide-react.

## AI provider

ExplainMyDoc supports two providers behind the same abstraction (`lib/ai/provider.ts`):

- **Google Gemini (default)** — has a real free tier with no card required, via
  [Google AI Studio](https://aistudio.google.com/apikey). This is the default specifically because
  a competition demo may be opened by several people at once, and a free tier removes billing risk
  entirely.
- **OpenAI** — fully supported, set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY` (requires a
  funded/billed account).

Both providers are asked to emit the same `EMBEDDING_DIM` (768) for their embeddings, so the
pgvector column has one fixed dimension regardless of which provider generated a given document's
embeddings — switching providers doesn't require a schema change.

## Environment variables

See [`.env.example`](.env.example) for the full list with descriptions. Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AI_PROVIDER` | `google` (default) or `openai` |
| `GOOGLE_API_KEY` | Required when `AI_PROVIDER=google` — free key at aistudio.google.com/apikey |
| `GOOGLE_MODEL` | Chat/completion model (default `gemini-flash-latest`) |
| `GOOGLE_EMBEDDING_MODEL` | Embedding model (default `gemini-embedding-001`) |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | Chat/completion model (default `gpt-4o-mini`) |
| `OPENAI_EMBEDDING_MODEL` | Embedding model (default `text-embedding-3-small`) |
| `EMBEDDING_DIM` | Output dimension both providers are forced to (default `768`) |
| `MAX_FILE_SIZE_MB` | Upload size limit |
| `STORAGE_DIR` | Local filesystem directory for uploaded files |
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

The MVP is built to be self-hosted (`next build && next start`) against a Postgres+pgvector
instance — the demo relies on background processing continuing after the upload request returns,
which needs a long-running Node process (not a serverless request/response cycle). To deploy:

1. Provision Postgres with the `pgvector` extension available (e.g. a small VM/Docker host, or a
   managed Postgres that supports installing extensions).
2. Set the environment variables from `.env.example`.
3. Run `npm run db:migrate && npm run db:seed` against that database.
4. `npm run build && npm run start` (or containerize with a Dockerfile using the same steps).
5. Point `STORAGE_DIR` at a persistent volume (or swap in a cloud `StorageProvider` — see below).

Deploying to a serverless platform (Vercel, etc.) would require moving document processing to a
proper background job/queue instead of the current fire-and-forget async call — see Limitations.

## Known limitations

- **No real authentication.** Single seeded demo user, by design for a frictionless demo. Isolated
  behind `lib/auth.ts` so real auth (e.g. a session-based provider) can be added without touching
  business logic.
- **Background processing assumes a long-running server.** Document processing is kicked off
  without blocking the upload response; this relies on the Node process staying alive afterward,
  which holds for `next dev`/`next start` but not for most serverless request lifecycles.
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
- Cloud storage provider (S3/Vercel Blob/Supabase Storage) for production deployments.
