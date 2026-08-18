import { FileStack, CheckCircle2, GraduationCap, Layers, Percent } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getDashboardStats, listDocumentsForUser } from "@/lib/db/queries";
import { StatTile } from "@/components/dashboard/stat-tile";
import { DocumentCard } from "@/components/documents/document-card";
import { UploadDropzone } from "@/components/upload/upload-dropzone";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const userId = getCurrentUserId();
  const [documents, stats] = await Promise.all([
    listDocumentsForUser(userId),
    getDashboardStats(userId),
  ]);

  const hasDocuments = documents.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="animate-in-fade">
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting()} 👋
        </h1>
        <p className="mt-1 text-foreground-muted">
          {hasDocuments
            ? "Continue studying, or upload something new."
            : "Upload your first document to see what's actually in it."}
        </p>
      </div>

      {hasDocuments && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Documents" value={stats.documentsTotal} icon={FileStack} />
          <StatTile
            label="Processed"
            value={stats.documentsProcessed}
            icon={CheckCircle2}
            accent="success"
          />
          <StatTile label="Quizzes done" value={stats.quizzesCompleted} icon={GraduationCap} />
          <StatTile
            label="Avg. quiz score"
            value={`${stats.averageQuizScore}%`}
            icon={Percent}
            accent="warning"
          />
          <StatTile label="Cards reviewed" value={stats.flashcardsReviewed} icon={Layers} />
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">
            {hasDocuments ? "Upload another document" : "Upload your first document"}
          </h2>
        </div>
        <UploadDropzone />
      </section>

      {hasDocuments && (
        <section className="mt-10">
          <h2 className="mb-3 font-medium">Your documents</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
