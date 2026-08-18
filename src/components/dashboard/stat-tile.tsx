import { cn } from "@/lib/utils/cn";

export function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "brand" | "success" | "warning";
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">{label}</p>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            accent === "success" && "bg-success-soft text-success",
            accent === "warning" && "bg-warning-soft text-warning",
            (!accent || accent === "brand") && "bg-brand-soft text-brand",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 font-serif text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
