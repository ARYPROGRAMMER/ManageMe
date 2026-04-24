import { cn } from "@/lib/utils";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface AnalyticsCardProps {
  title: string;
  value: number;
  variant: "up" | "down";
  increaseValue: number;
}

export const AnalyticsCard = ({
  title,
  value,
  variant,
  increaseValue,
}: AnalyticsCardProps) => {
  const iconColor = variant === "up" ? "text-emerald-500" : "text-red-500";
  const increaseValueColor =
    variant === "up" ? "text-emerald-200" : "text-red-200";
  const Icon = variant === "up" ? FaCaretUp : FaCaretDown;

  return (
    <Card className="w-full border-none bg-transparent shadow-none">
      <CardHeader className="p-5">
        <div className="flex items-center gap-x-2.5">
          <CardDescription className="flex items-center gap-x-2 overflow-hidden font-medium">
            <span className="truncate text-sm text-neutral-400">{title}</span>
          </CardDescription>
          <div className="flex items-center gap-x-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
            <Icon className={cn(iconColor, "size-4")} />

            <span
              className={cn(
                increaseValueColor,
                "truncate text-xs font-semibold"
              )}
            >
              {increaseValue}
            </span>
          </div>
        </div>

        <CardTitle className="text-3xl font-bold text-white">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
};
