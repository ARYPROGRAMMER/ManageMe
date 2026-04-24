"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  KanbanSquare,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Sparkles,
  Users2,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const features = [
  {
    icon: KanbanSquare,
    title: "Projects that stay readable",
    body: "Track tasks across table, kanban, and calendar views without turning your workspace into noise.",
  },
  {
    icon: MessageSquareText,
    title: "OpenClaw-ready automation",
    body: "Capture work from Discord, Telegram, Slack, and assistant workflows through the existing secure API routes.",
  },
  {
    icon: Users2,
    title: "Workspace operations",
    body: "Invite members, switch workspaces, tune roles, and manage shared delivery rituals from one polished shell.",
  },
];

const proof = ["Appwrite auth", "Workspace switching", "Project settings", "Task automation"];

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.55 };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 soft-grid opacity-60" />
      <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.08] blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <nav className="glass-panel sticky top-4 z-30 flex items-center justify-between rounded-3xl px-4 py-3">
          <BrandLogo />
          <div className="hidden items-center gap-6 text-sm text-neutral-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#automation" className="transition hover:text-white">
              Automation
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Benefits
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">
                Start
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </nav>

        <section className="grid min-h-[calc(100vh-6rem)] items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fade}
            transition={transition}
            className="max-w-3xl"
          >
            <Badge variant="secondary" className="mb-6">
              <Sparkles className="mr-2 size-3.5" />
              Premium task operations for modern teams
            </Badge>
            <h1 className="text-balance text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              Manage work in a calmer, sharper command center.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-400 sm:text-lg">
              ManageMe brings workspaces, projects, members, task views, and
              OpenClaw automation into a polished dark interface built for
              repeat use.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Create workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/sign-in">Open existing account</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {proof.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-semibold text-neutral-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-full bg-white/[0.08] blur-3xl" />
            <div className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-4">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div>
                  <p className="text-xs uppercase text-neutral-500">Workspace</p>
                  <p className="mt-1 font-semibold text-white">Northstar Launch</p>
                </div>
                <div className="flex -space-x-2">
                  {["A", "R", "M"].map((letter) => (
                    <span
                      key={letter}
                      className="flex size-9 items-center justify-center rounded-full border border-black bg-white text-xs font-bold text-black"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[0.75fr_1fr]">
                <div className="space-y-4">
                  {[
                    ["Total Tasks", "128", "+14"],
                    ["Completed", "72", "+9"],
                    ["Overdue", "04", "-2"],
                  ].map(([label, value, diff]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"
                    >
                      <p className="text-xs text-neutral-500">{label}</p>
                      <div className="mt-3 flex items-end justify-between">
                        <span className="text-3xl font-bold text-white">
                          {value}
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-neutral-300">
                          {diff}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold text-white">Delivery board</p>
                    <CalendarCheck className="size-5 text-neutral-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["Backlog", "Progress", "Done"].map((column, index) => (
                      <div key={column} className="space-y-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-neutral-300">
                          {column}
                        </div>
                        {[0, 1, 2].slice(0, 3 - (index === 2 ? 1 : 0)).map((task) => (
                          <div
                            key={`${column}-${task}`}
                            className="min-h-24 rounded-xl border border-white/10 bg-white/[0.07] p-3 shadow-lg shadow-black/20"
                          >
                            <div className="mb-4 h-2 w-3/4 rounded-full bg-white/30" />
                            <div className="h-2 w-1/2 rounded-full bg-white/10" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="py-16">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-neutral-500">
                Product system
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                Everything feels intentionally connected.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-neutral-400">
              The redesigned interface keeps your existing routes and data
              model intact while making each workflow easier to scan.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass-panel rounded-3xl p-6 transition duration-200 hover:-translate-y-1 hover:border-white/20"
                >
                  <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                    <Icon className="size-6 text-neutral-200" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="automation"
          className="grid gap-4 py-16 lg:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="glass-panel rounded-3xl p-8">
            <Bot className="mb-6 size-10 text-white" />
            <h2 className="text-3xl font-bold text-white">
              Built for agent-assisted work.
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              OpenClaw integrations connect chat channels to workspace tasks
              without bypassing ManageMe permissions or workspace secrets.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Secure workspace secret",
              "Task creation endpoint",
              "Project listing",
              "Attachment capture",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-6"
              >
                <CheckCircle2 className="mb-5 size-6 text-neutral-200" />
                <p className="font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="py-16">
          <div className="glass-panel-strong grid gap-8 rounded-[2rem] p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm text-neutral-400">
                <LockKeyhole className="size-4" />
                Existing auth and Appwrite flows preserved
              </div>
              <h2 className="text-3xl font-bold text-white">
                Start with the product, not a generic dashboard.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400">
                A cleaner shell, richer states, and sharper task surfaces make
                the app feel premium without changing the data flow underneath.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-neutral-500 md:flex-row md:items-center md:justify-between">
          <BrandLogo compact />
          <div className="flex items-center gap-2">
            <Layers3 className="size-4" />
            <span>ManageMe monochrome product experience</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
