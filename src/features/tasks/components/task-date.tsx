import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";

interface TaskDateProps {
  value: string;
  className?: string;
}

export function TaskDate({ value, className }: TaskDateProps) {
  const today = new Date();
  const endDate = new Date(value);
  const diffInDays = differenceInDays(endDate, today);

  let textColor = "text-muted-foreground";

  if (diffInDays < 3) {
    textColor = "text-red-300";
  } else if (diffInDays < 7) {
    textColor = "text-amber-200";
  } else if (diffInDays < 14) {
    textColor = "text-neutral-200";
  }

  return (
    <div className={cn(textColor, "min-w-0")}>
      <span className={cn("truncate", className)}>
        {format(endDate, "PPP")}
      </span>
    </div>
  );
}
