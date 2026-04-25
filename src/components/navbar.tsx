"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { useEffect, useState } from "react";
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
    description: "View and manage your projects.",
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 4);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`
      sticky top-0 z-20 border-b border-white/10 
      ${scrolled ? "bg-background/90 backdrop-blur-lg" : "bg-background/70 backdrop-blur-2xl"}
      transition-all duration-300 px-4 py-3 sm:px-6 lg:px-8
    `}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
        <div className="flex-col hidden lg:flex">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <MobileSidebar />
   
        <UserButton />
      </div>
    </nav>
  );
}

export default Navbar;
