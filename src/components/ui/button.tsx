import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border border-white/90 bg-white text-black shadow-[0_12px_35px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 hover:bg-neutral-200 hover:shadow-[0_18px_45px_rgba(255,255,255,0.16)] active:translate-y-0",
        destructive:
          "border border-red-400/40 bg-red-500/15 text-red-100 shadow-sm hover:-translate-y-0.5 hover:bg-red-500/25 hover:text-white",
        outline:
          "border border-white/15 bg-white/[0.03] text-white shadow-sm hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]",
        secondary:
          "border border-white/10 bg-white/[0.08] text-white shadow-sm hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.13]",
        ghost:
          "border border-transparent bg-transparent text-neutral-300 shadow-none hover:bg-white/[0.08] hover:text-white",
        muted:
          "border border-white/10 bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1] hover:text-white",
        teritary:
          "border border-white/10 bg-white/[0.1] text-white shadow-none hover:-translate-y-0.5 hover:bg-white/[0.16]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3",
        xs: "h-7 rounded-md px-2 text-xs",
        lg: "h-12 rounded-xl px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
