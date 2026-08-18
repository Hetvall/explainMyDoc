import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentLoading() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr_380px]">
      <Skeleton className="h-48" />
      <Skeleton className="h-[500px]" />
      <Skeleton className="h-[500px]" />
    </div>
  );
}
