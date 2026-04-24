"use client";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import { MessageSquare, SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  GoCheckCircle,
  GoCheckCircleFill,
  GoHome,
  GoHomeFill,
} from "react-icons/go";

const routes = [
  {
    label: "Home",
    href: "",
    icon: GoHome,
    activeIcon: GoHomeFill,
  },
  {
    label: "My Tasks",
    href: "/tasks",
    icon: GoCheckCircle,
    activeIcon: GoCheckCircleFill,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    activeIcon: SettingsIcon,
  },
  {
    label: "Connect Platforms",
    href: "/settings/connect",
    icon: MessageSquare,
    activeIcon: MessageSquare,
  },
  {
    label: "Members",
    href: "/members",
    icon: UsersIcon,
    activeIcon: UsersIcon,
  },
];

function Navigation() {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {routes.map((item) => {
        const fullHref = `/workspaces/${workspaceId}${item.href}`;
        const isActive = pathname === fullHref;
        const Icon = isActive ? item.activeIcon : item.icon;

        return (
          <Link key={item.href} href={fullHref}>
            <div
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-500 transition-all hover:bg-white/[0.06] hover:text-white",
                isActive &&
                  "border border-white/10 bg-white text-black shadow-[0_14px_38px_rgba(255,255,255,0.1)] hover:bg-white hover:text-black",
              )}
            >
              <Icon
                className={cn(
                  "size-5 text-neutral-500 transition-colors group-hover:text-white",
                  isActive && "text-black group-hover:text-black"
                )}
              />
              {item.label}
            </div>
          </Link>
        );
      })}
    </ul>
  );
}

export default Navigation;
