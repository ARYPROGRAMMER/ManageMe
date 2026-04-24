import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@/features/tasks/types";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-white text-black shadow hover:bg-neutral-200",
        secondary:
          "border-white/10 bg-white/[0.08] text-neutral-100 hover:bg-white/[0.14]",
        destructive:
          "border-red-400/30 bg-red-500/15 text-red-100 shadow hover:bg-red-500/25",
        outline: "border-white/15 text-foreground",
        [TaskStatus.TODO]:
          "border-neutral-500/30 bg-neutral-500/15 text-neutral-200 hover:bg-neutral-500/25",
        [TaskStatus.IN_PROGRESS]:
          "border-amber-300/25 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15",
        [TaskStatus.DONE]:
          "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15",
        [TaskStatus.BACKLOG]:
          "border-white/10 bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]",
        [TaskStatus.IN_REVIEW]:
          "border-sky-300/25 bg-sky-300/10 text-sky-100 hover:bg-sky-300/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
