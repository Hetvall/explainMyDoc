import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  documentChunks,
  documents,
  flashcards,
  quizAttempts,
  quizzes,
  summaries,
  type NewDocument,
} from "./schema";

/**
 * All document reads/writes go through here and are always scoped by
 * `userId` — never trust a client-supplied id without this check. A
 * document that doesn't belong to the caller looks identical to a
 * document that doesn't exist (no leaking existence via 403 vs 404).
 */

export async function createDocument(input: NewDocument) {
  const [doc] = await db.insert(documents).values(input).returning();
  return doc;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if `value` is UUID-shaped. Any id from a URL param should be checked with this before it reaches a uuid-typed column — Postgres throws (not "no rows") on a malformed cast. */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getOwnedDocument(documentId: string, userId: string) {
  // A malformed id (e.g. from a stale link or someone poking the URL) must
  // behave like "not found", not throw a Postgres uuid-cast error.
  if (!isValidUuid(documentId)) return null;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  return doc ?? null;
}

export async function listDocumentsForUser(userId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function updateDocumentStatus(
  documentId: string,
  status: "uploaded" | "processing" | "processed" | "failed",
  extra?: {
    errorMessage?: string | null;
    pageCount?: number;
    wordCount?: number;
    extractedText?: { pageNumber: number; text: string }[];
  },
) {
  await db
    .update(documents)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(documents.id, documentId));
}

export async function deleteDocument(documentId: string, userId: string) {
  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
}

export async function getDocumentChunks(documentId: string) {
  return db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .orderBy(documentChunks.chunkIndex);
}

export async function getSummaryForDocument(documentId: string) {
  const [row] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.documentId, documentId))
    .limit(1);
  return row ?? null;
}

/** Aggregate stats for the dashboard, scoped to one user. */
export async function getDashboardStats(userId: string) {
  const [docStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      processed: sql<number>`count(*) filter (where ${documents.status} = 'processed')::int`,
    })
    .from(documents)
    .where(eq(documents.userId, userId));

  const [quizStats] = await db
    .select({
      completed: sql<number>`count(*)::int`,
      avgPercentage: sql<number>`coalesce(avg(${quizAttempts.percentage}), 0)::float`,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(documents, eq(quizzes.documentId, documents.id))
    .where(eq(documents.userId, userId));

  const [flashcardStats] = await db
    .select({
      reviewed: sql<number>`count(*) filter (where ${flashcards.lastReviewedAt} is not null)::int`,
    })
    .from(flashcards)
    .innerJoin(documents, eq(flashcards.documentId, documents.id))
    .where(eq(documents.userId, userId));

  return {
    documentsTotal: docStats?.total ?? 0,
    documentsProcessed: docStats?.processed ?? 0,
    quizzesCompleted: quizStats?.completed ?? 0,
    averageQuizScore: Math.round(quizStats?.avgPercentage ?? 0),
    flashcardsReviewed: flashcardStats?.reviewed ?? 0,
  };
}
