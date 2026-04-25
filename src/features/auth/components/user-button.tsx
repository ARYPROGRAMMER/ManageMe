"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "../api/use-logout";
import { useCurrent } from "../api/use-current";
import { Loader, LogOut, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

/* ─── Tiny reticle rings behind the large avatar ────────────── */
const MiniReticle = () => (
  <svg
    aria-hidden
    viewBox="0 0 80 80"
    fill="none"
    style={{
      position: "absolute",
      top: -12,
      right: -12,
      width: 64,
      opacity: 0.05,
      pointerEvents: "none",
    }}
  >
    <circle cx="40" cy="40" r="36" stroke="white" strokeWidth="0.5" />
    <circle cx="40" cy="40" r="22" stroke="white" strokeWidth="0.5" />
    <circle cx="40" cy="40" r="9"  stroke="white" strokeWidth="0.5" />
    <line x1="40" y1="0"  x2="40" y2="28" stroke="white" strokeWidth="0.4" />
    <line x1="40" y1="52" x2="40" y2="80" stroke="white" strokeWidth="0.4" />
    <line x1="0"  y1="40" x2="28" y2="40" stroke="white" strokeWidth="0.4" />
    <line x1="52" y1="40" x2="80" y2="40" stroke="white" strokeWidth="0.4" />
  </svg>
);

/* ─── Noise grain overlay ────────────────────────────────────── */
const Grain = () => (
  <div
    aria-hidden
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='1'/%3E%3C/svg%3E\")",
      backgroundSize: "200px 200px",
      opacity: 0.02,
      mixBlendMode: "overlay" as const,
      pointerEvents: "none",
      borderRadius: "inherit",
    }}
  />
);

/* ─── Rule ───────────────────────────────────────────────────── */
const Rule = () => (
  <div
    style={{
      height: 1,
      margin: "0 0.75rem",
      background:
        "linear-gradient(90deg,transparent,rgba(255,255,255,0.07) 30%,rgba(255,255,255,0.07) 70%,transparent)",
    }}
  />
);

/* ══════════════════════════════════════════════════════════════ */

export const UserButton = () => {
  const { data: user, isLoading } = useCurrent();
  const { mutate, isPending } = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.07)",
        }}
      >
        <Loader style={{ width: 14, height: 14, color: "rgba(255,255,255,0.25)" }} className="animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const { name, email } = user;
  const fallback = name
    ? name.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase() ?? "U";

  return (
    <DropdownMenu modal={false}>

      {/* ── Trigger ─────────────────────────────────────────── */}
      <DropdownMenuTrigger className="outline-none group relative">
        {/* precision ring pulse border */}
        <div
          style={{
            padding: 1.5,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4)",
            transition: "box-shadow 0.2s",
          }}
          className="group-hover:[box-shadow:0_0_0_1px_rgba(255,255,255,0.14),0_4px_14px_rgba(0,0,0,0.5)]"
        >
          <Avatar
            style={{
              width: 32,
              height: 32,
              transition: "transform 0.15s",
            }}
            className="group-hover:scale-105"
          >
            <AvatarFallback
              style={{
                background: "linear-gradient(145deg,#1e1e22,#161618)",
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.01em",
              }}
            >
              {fallback}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Online indicator */}
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 0 1.5px #0c0c0e",
          }}
        />
      </DropdownMenuTrigger>

      {/* ── Dropdown panel ──────────────────────────────────── */}
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={10}
        className="p-0 border-0 w-[220px] overflow-hidden"
        style={{
          background: "linear-gradient(165deg,#141417 0%,#0f0f12 100%)",
          boxShadow: [
            "0 0 0 1px rgba(255,255,255,0.07)",
            "inset 0 1px 0 rgba(255,255,255,0.065)",
            "0 4px 6px rgba(0,0,0,0.35)",
            "0 20px 50px rgba(0,0,0,0.75)",
          ].join(","),
          borderRadius: "1rem",
        }}
      >
        <Grain />

        {/* ── Profile block ─────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "1.4rem 1rem 1.1rem",
            overflow: "hidden",
          }}
        >
          <MiniReticle />

          {/* Subtle vignette bottom fade */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 24,
              background: "linear-gradient(to top,rgba(15,15,18,0.5),transparent)",
              pointerEvents: "none",
            }}
          />

          {/* Avatar with graduated ring */}
          <div
            style={{
              padding: 2,
              borderRadius: "50%",
              background: "linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))",
            }}
          >
            <Avatar style={{ width: 48, height: 48 }}>
              <AvatarFallback
                style={{
                  background: "linear-gradient(145deg,#1e1e22,#141417)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                }}
              >
                {fallback}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name + email */}
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.84rem",
                fontWeight: 600,
                color: "#e8e8e8",
                letterSpacing: "-0.015em",
                lineHeight: 1.3,
              }}
            >
              {name || "User"}
            </p>
            <p
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: "0.15rem",
                maxWidth: 170,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {email}
            </p>
          </div>
        </div>

        <Rule />

        {/* ── Menu items ────────────────────────────────────── */}
        <div style={{ padding: "0.4rem" }}>
          {/* Settings (non-destructive) */}
          <DropdownMenuItem
            className="flex items-center gap-2.5 h-9 px-3 rounded-[0.5rem] cursor-pointer text-sm font-medium"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
             onClick={() => router.push(`${pathname}/settings`)}
          >
            
            <Settings style={{ width: 14, height: 14, opacity: 0.6 }} />
            Settings
          </DropdownMenuItem>

          {/* Logout (destructive) */}
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => mutate()}
            className="flex items-center gap-2.5 h-9 px-3 rounded-[0.5rem] cursor-pointer"
            style={{
              color: "rgba(248,113,113,0.8)",
              fontSize: "0.8rem",
              fontWeight: 500,
              marginTop: "0.1rem",
            }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            {isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </div>

        {/* bottom padding */}
        <div style={{ height: "0.3rem" }} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};