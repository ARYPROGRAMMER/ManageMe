"use client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import React from "react";

const ErrorPage = () => {
  return (
    <div className="soft-grid flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel flex w-full max-w-lg flex-col items-center rounded-3xl p-8 text-center">
        <BrandLogo className="mb-8" />
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <AlertTriangle className="size-7 text-neutral-300" />
        </div>
        <h1 className="text-2xl font-bold text-white">Something slipped.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The app hit an unexpected state. Your data and session flows are still
          protected.
        </p>
        <Button variant={"secondary"} size={"sm"} asChild className="mt-6">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
