import Link from "next/link";
import { FileStack } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <FileStack className="size-4" />
          </span>
          <span className="font-serif text-base tracking-tight">ExplainMyDoc</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
