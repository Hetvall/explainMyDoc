import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <FileQuestion className="size-6" />
      </div>
      <div>
        <h1 className="font-serif text-xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          It may have been removed, or the link might be incorrect.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
