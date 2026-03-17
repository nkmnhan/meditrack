import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium",
  {
    variants: {
      variant: {
        /* ── shadcn defaults (backwards-compatible) ── */
        default: "border border-transparent bg-primary text-primary-foreground hover:bg-primary/80 font-semibold transition-colors",
        secondary: "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold transition-colors",
        destructive: "border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 font-semibold transition-colors",
        outline: "border text-foreground font-semibold",

        /* ── Semantic soft (no visible border) ── */
        success: "border border-transparent bg-success-50 text-success-700",
        warning: "border border-transparent bg-warning-50 text-warning-700",
        error: "border border-transparent bg-error-50 text-error-700",
        info: "border border-transparent bg-info-50 text-info-700",
        accent: "border border-transparent bg-accent-50 text-accent-700",
        primary: "border border-transparent bg-primary-100 text-primary-700",
        neutral: "border border-transparent bg-muted text-muted-foreground",

        /* ── Semantic bordered ── */
        "success-bordered": "border border-success-200 bg-success-50 text-success-700",
        "warning-bordered": "border border-warning-200 bg-warning-50 text-warning-700",
        "error-bordered": "border border-error-200 bg-error-50 text-error-700",
        "info-bordered": "border border-info-200 bg-info-50 text-info-700",
        "accent-bordered": "border border-accent-200 bg-accent-50 text-accent-700",
        "primary-bordered": "border border-primary-200 bg-primary-50 text-primary-700",
        "neutral-bordered": "border border-border bg-muted text-muted-foreground",
      },
      size: {
        xs: "px-1.5 py-0.5 text-[10px]",
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
