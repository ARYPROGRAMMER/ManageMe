import { UserButton } from "@/features/auth/components/user-button";
import { BrandLogo } from "@/components/brand-logo";
import React from "react";

interface StandaloneLayoutProps {
  children: React.ReactNode;
}

const StandaloneLayout = ({ children }: StandaloneLayoutProps) => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 soft-grid opacity-40" />
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-white/[0.08] blur-3xl" />
      <div className="relative mx-auto max-w-screen-2xl p-4 sm:p-6">
        <nav className="glass-panel flex h-[76px] items-center justify-between rounded-3xl px-4">
          <BrandLogo />
          <UserButton />
        </nav>

        <div className="flex flex-col items-center justify-center py-8">
          {children}
        </div>
      </div>
    </main>
  );
};

export default StandaloneLayout;
