import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * ExplainMyDoc database schema.
 *
 * Design notes:
 * - UUID primary keys everywhere (generated in Postgres via gen_random_uuid()).
 * - Every document-scoped table carries `documentId` so ownership checks
 *   (lib/db/queries.ts) can always join back to `documents.userId`.
 * - `document_chunks.embedding` is a pgvector column with an HNSW index for
 *   fast cosine-similarity search (the core of the RAG pipeline).
 * - Structured AI output (summaries, quiz options, study plans) is stored as
 *   `jsonb` and validated with Zod schemas in lib/ai/schemas.ts before write.
 */

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "processing",
  "processed",
  "failed",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const quizDifficultyEnum = pgEnum("quiz_difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const flashcardRatingEnum = pgEnum("flashcard_rating", [
  "again",
  "hard",
  "good",
  "easy",
]);

// --- users --------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- documents ------------------------------------------------------------

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    status: documentStatusEnum("status").notNull().default("uploaded"),
    /** Key/path resolved through lib/storage/ — never a raw filesystem path from the client. */
    storageKey: text("storage_key").notNull(),
    pageCount: integer("page_count"),
    wordCount: integer("word_count"),
    errorMessage: text("error_message"),
    /** Cleaned, per-page text for display in the document viewer — kept separate from the overlapping RAG chunks below. */
    extractedText: jsonb("extracted_text").$type<{ pageNumber: number; text: string }[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("documents_user_id_idx").on(table.userId)],
);

// --- document_chunks --------------------------------------------------------

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    pageNumber: integer("page_number"),
    // 768 matches EMBEDDING_DIM in lib/env.ts — both supported providers
    // (Google, OpenAI) are asked to emit this many dimensions regardless
    // of which one generated a given embedding (see lib/ai/provider.ts).
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("document_chunks_document_id_idx").on(table.documentId),
    index("document_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

// --- summaries --------------------------------------------------------------

export const summaries = pgTable(
  "summaries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .unique()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** Structured JSON matching lib/ai/schemas.ts#summarySchema (tldr, keyPoints, concepts, actionItems, whoShouldCare, readingTimeMinutes). */
    summary: jsonb("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// --- conversations / messages (RAG chat) -------------------------------------

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("conversations_document_id_idx").on(table.documentId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    /** Source attribution for assistant messages: [{ pageNumber, chunkIndex, snippet }]. */
    sources: jsonb("sources"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_conversation_id_idx").on(table.conversationId)],
);

// --- quizzes ------------------------------------------------------------

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    difficulty: quizDifficultyEnum("difficulty").notNull(),
    questionCount: integer("question_count").notNull(),
    /** Best/most recent score out of questionCount; null until attempted. */
    score: integer("score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quizzes_document_id_idx").on(table.documentId)],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    questionIndex: integer("question_index").notNull(),
    question: text("question").notNull(),
    options: jsonb("options").notNull().$type<string[]>(),
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation").notNull(),
  },
  (table) => [index("quiz_questions_quiz_id_idx").on(table.quizId)],
);

/** One row per completed attempt, so score history / progress can be tracked. */
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    percentage: real("percentage").notNull(),
    /** [{ questionId, selectedAnswer, correct }] */
    answers: jsonb("answers").notNull(),
    weakAreas: jsonb("weak_areas").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quiz_attempts_quiz_id_idx").on(table.quizId)],
);

// --- flashcards ------------------------------------------------------------

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    /** Last self-rating given by the user; null until first review. Basis for a future SRS scheduler. */
    difficulty: flashcardRatingEnum("difficulty"),
    reviewCount: integer("review_count").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("flashcards_document_id_idx").on(table.documentId)],
);

// --- study plans ------------------------------------------------------------

export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    goal: text("goal").notNull(),
    availableDays: integer("available_days").notNull(),
    hoursPerDay: real("hours_per_day").notNull(),
    difficulty: quizDifficultyEnum("difficulty").notNull(),
    /** [{ day, title, tasks: string[] }] matching lib/ai/schemas.ts#studyPlanSchema. */
    plan: jsonb("plan").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("study_plans_document_id_idx").on(table.documentId)],
);

// --- relations (for typed nested queries) ------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  chunks: many(documentChunks),
  summary: one(summaries, {
    fields: [documents.id],
    references: [summaries.documentId],
  }),
  conversations: many(conversations),
  quizzes: many(quizzes),
  flashcards: many(flashcards),
  studyPlans: many(studyPlans),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [conversations.documentId],
      references: [documents.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  document: one(documents, {
    fields: [quizzes.documentId],
    references: [documents.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  document: one(documents, {
    fields: [flashcards.documentId],
    references: [documents.id],
  }),
}));

export const studyPlansRelations = relations(studyPlans, ({ one }) => ({
  document: one(documents, {
    fields: [studyPlans.documentId],
    references: [documents.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type Summary = typeof summaries.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
export type StudyPlan = typeof studyPlans.$inferSelect;
