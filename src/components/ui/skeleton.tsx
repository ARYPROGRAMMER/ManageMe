import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[linear-gradient(110deg,rgba(255,255,255,0.05),rgba(255,255,255,0.13),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
