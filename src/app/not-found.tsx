"use client";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="soft-grid flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel relative w-full max-w-2xl overflow-hidden rounded-3xl p-8 text-center">
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <BrandLogo className="mx-auto mb-10 justify-center" />
        <div className="mono-shine animate-shimmer text-8xl font-bold">404</div>
        <h1 className="mt-6 text-3xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          This route does not exist in the current workspace flow. Head home or
          return to the previous page.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
