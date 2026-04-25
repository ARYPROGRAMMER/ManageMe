import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  className?: string;
  label?: string;
  fillScreen?: boolean;
}

export function AppLoader({ className, label, fillScreen }: AppLoaderProps) {
  return (
    <div
      className={cn(
        "loading-cursor flex flex-col items-center justify-center gap-5 text-center",
        fillScreen && "min-h-screen",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative size-20">
        <div className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.03] blur-xl" />
        <div className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="block rounded-md border border-white/15 bg-white/20 shadow-[0_0_22px_rgba(255,255,255,0.12)] animate-transformer-fold"
              style={{ animationDelay: `${index * 0.16}s` }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-neutral-200">{label}</p>
        <div className="mx-auto h-px w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}

// Back-compat alias. Prefer `AppLoader` going forward.
export const PremiumLoader = AppLoader;
