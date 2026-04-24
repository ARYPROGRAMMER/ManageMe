"use client";

import { UserButton } from "@/features/auth/components/user-button";
import React from "react";
import MobileSidebar from "./mobile-sidebar";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";

const pathnameMap = {
  tasks: {
    title: "Tasks",
    description: "View, filter, and move work across every task view.",
  },
  projects: {
    title: "Projects",
    description: "Focus on one project while keeping execution visible.",
  },
  settings: {
    title: "Settings",
    description: "Tune workspace details, invites, and connected platforms.",
  },
  members: {
    title: "Members",
    description: "Manage roles and access for this workspace.",
  },
};

const defaultMap = {
  title: "Home",
  description: "Monitor the pulse of projects, tasks, and collaborators.",
};

function Navbar() {
  const pathname = usePathname();
  const pathnameParts = pathname.split("/");

  const pathnameKey = pathnameParts[3] as keyof typeof pathnameMap;

  const { title, description } = pathnameMap[pathnameKey] || defaultMap;

  return (
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-background/70 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
      <div className="flex-col hidden lg:flex">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <MobileSidebar />
        <div className="ml-auto hidden h-10 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-muted-foreground md:flex">
          <Activity className="mr-2 size-4" />
          <span>Live workspace</span>
        </div>
        <UserButton />
      </div>
    </nav>
  );
}

export default Navbar;
