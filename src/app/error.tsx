"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <h1 className="font-serif text-xl font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-foreground-muted">
          An unexpected error occurred. You can try again, or head back to your dashboard.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
