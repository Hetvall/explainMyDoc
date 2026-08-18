import { CheckCircle2, Loader2, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/lib/db/schema";

const config: Record<
  Document["status"],
  { label: string; variant: "success" | "default" | "danger" | "secondary"; icon: React.ElementType }
> = {
  uploaded: { label: "Queued", variant: "secondary", icon: Clock },
  processing: { label: "Processing", variant: "default", icon: Loader2 },
  processed: { label: "Ready", variant: "success", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "danger", icon: AlertTriangle },
};

export function StatusBadge({ status }: { status: Document["status"] }) {
  const { label, variant, icon: Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon className={cnIcon(status)} />
      {label}
    </Badge>
  );
}

function cnIcon(status: Document["status"]) {
  return status === "processing" ? "size-3 animate-spin" : "size-3";
}
