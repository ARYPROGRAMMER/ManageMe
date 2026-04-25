"use client";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AuthLayoutProps {
  children: React.ReactNode;
}
const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 soft-grid opacity-50" />
      <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-white/[0.08] blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-screen-2xl flex-col p-4 sm:p-6">
        <nav className="glass-panel flex items-center justify-between rounded-3xl px-4 py-3">
          <BrandLogo />

          <Button asChild variant={"secondary"} size="sm">
            <Link href={pathname === "/sign-in" ? "/sign-up" : "/sign-in"}>
              {pathname === "/sign-in" ? "Sign Up" : "Sign In"}
            </Link>
          </Button>
        </nav>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
          <section className="hidden max-w-2xl lg:block">
            <p className="text-sm font-semibold uppercase text-neutral-500">
              ManageMe workspace access
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-tight text-white">
              Step into a calmer command center.
            </h1>
            <p className="mt-5 text-base leading-8 text-neutral-400">
              Sign in to manage workspaces, projects, members, task boards,
              calendar views, and automation settings in one focused dark UI.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                "Secure Appwrite session",
                "Workspace switching",
                "OpenClaw setup",
                "Task workflows",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold text-neutral-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
          <div className="flex justify-center">{children}</div>
        </div>
      </div>
    </main>
  );
};

export default AuthLayout;
