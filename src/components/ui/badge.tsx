import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-brand-soft text-brand border-transparent",
        secondary: "bg-surface-muted text-foreground-muted border-transparent",
        outline: "border-border text-foreground-muted bg-transparent",
        success: "bg-success-soft text-success border-transparent",
        danger: "bg-danger-soft text-danger border-transparent",
        warning: "bg-warning-soft text-warning border-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
