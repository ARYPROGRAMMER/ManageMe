import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  className?: string;
  compact?: boolean;
}

export function BrandLogo({ href = "/", className, compact }: BrandLogoProps) {
  const content = (
    <div className={cn("group inline-flex items-center gap-3", className)}>
      <div className="relative flex size-10 items-center justify-center rounded-2xl border border-white/15 bg-white text-black shadow-[0_14px_40px_rgba(255,255,255,0.13)] transition-transform duration-200 group-hover:-translate-y-0.5">
        <span className="text-lg font-bold leading-none">M</span>
        <span className="absolute -right-1 -top-1 size-3 rounded-full border border-black/10 bg-black" />
      </div>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight text-white">
            ManageMe
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            workspace
          </span>
        </div>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
