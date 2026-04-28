"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  KanbanSquare,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Users2,
  Zap,
  Globe,
  Shield,
  BarChart3,
  Terminal,
  TrendingUp,
  Play,
  ChevronRight,
  Star,
  Command,
  Cpu,
  Workflow,
  Sparkles,
  MessageCircle,
  Hash,
  Send,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";

/* ─── Design tokens ──────────────────────────────────────────────── */
const BG = "#070708";
const BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#3a3a3e";
const SURFACE = "rgba(255,255,255,0.03)";

/* ─── Infinite marquee ───────────────────────────────────────────── */
const INTEGRATIONS = [
  "Discord",
  "WhatsApp",
  "Telegram",
  "Slack",
  "Microsoft Teams"
];

function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <div className="relative overflow-hidden py-1">
      <div
        className="absolute left-0 top-0 z-10 h-full w-32 pointer-events-none"
        style={{ background: `linear-gradient(90deg,${BG},transparent)` }}
      />
      <div
        className="absolute right-0 top-0 z-10 h-full w-32 pointer-events-none"
        style={{ background: `linear-gradient(270deg,${BG},transparent)` }}
      />
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.35)" }}
            />
            <span className="text-[11px] font-medium tracking-wide text-neutral-500">
              {item}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Hover tilt card (CSS only, no hydration risk) ─────────────── */
function HoverCard({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`group relative ${className}`}
      style={{
        transformStyle: "preserve-3d",
        transition:
          "transform 0.4s cubic-bezier(0.23,1,0.32,1), border-color 0.3s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated number counter ────────────────────────────────────── */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = Math.ceil(to / 60);
          const t = setInterval(() => {
            start = Math.min(start + step, to);
            setCount(start);
            if (start >= to) clearInterval(t);
          }, 16);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ─── Data ───────────────────────────────────────────────────────── */
const STATS = [
  { value: 128, suffix: "k+", label: "tasks managed" },
  { value: 99, suffix: ".9%", label: "uptime SLA" },
  { value: 4, suffix: "+", label: "channel bots" },
  { value: 2, suffix: " min", label: "avg setup" },
];

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Flexible project views",
    body: "Table, kanban, and calendar — switch without losing context. Filter by assignee, deadline, or status. Your workspace, your way.",
    wide: true,
  },
  {
    icon: Zap,
    title: "Task automation",
    body: "Capture work from Discord, WhatsApp, Telegram, and Slack through secure API routes.",
  },
  {
    icon: Shield,
    title: "Zero-trust tokens",
    body: "Appwrite auth with scoped workspace secrets keeps data exactly where it belongs.",
  },
  {
    icon: Users2,
    title: "Workspace ops",
    body: "Invite members, switch workspaces, and manage rituals from one polished shell.",
  },
  {
    icon: BarChart3,
    title: "Delivery analytics",
    body: "Understand velocity, overdue patterns, and throughput — no extra tooling.",
  },
  {
    icon: Globe,
    title: "Multi-channel",
    body: "Unified presence across Discord, WhatsApp, Telegram, Slack, and the web dashboard.",
  },
];

const CHANNELS = [
  { icon: Hash, name: "Discord", desc: "Slash commands & mentions" },
  { icon: MessageCircle, name: "WhatsApp", desc: "Business API integration" },
  { icon: Send, name: "Telegram", desc: "Bot with inline buttons" },
  { icon: MessageSquareText, name: "Slack", desc: "App with workflow steps" },
];

const HOW = [
  {
    n: "01",
    title: "Create your workspace",
    body: "Set up in under 2 minutes. Invite your team and configure your delivery ritual.",
  },
  {
    n: "02",
    title: "Connect your channels",
    body: "Link Discord, WhatsApp, Telegram, or Slack through a single workspace token. No extra permissions.",
  },
  {
    n: "03",
    title: "Ship with clarity",
    body: "Manage tasks from table, kanban, and calendar views. Let automation handle the noise.",
  },
];


export function LandingPage() {
  const noMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 72);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const tx = (delay = 0) =>
    noMotion ? { duration: 0 } : { duration: 0.7, ease, delay };

  return (
    <>
      <div className="noise-overlay" />

      <main
        className="fb relative min-h-screen overflow-x-hidden"
        style={{ background: BG, color: "#fff" }}
        suppressHydrationWarning
      >
        <div className="fixed inset-0 grid-bg pointer-events-none opacity-100" />

        <div
          className="fixed top-[-15vh] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.025) 0%, transparent 65%)",
          }}
        />
        <div
          className="fixed bottom-[-10vh] right-[-5vw] w-[40vw] h-[40vh] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.015) 0%, transparent 70%)",
          }}
        />

        <div className="fixed z-50 inset-x-0 top-0 flex justify-center">
          <nav
            className="flex items-center justify-between transition-all duration-500"
            style={{
              width: scrolled
                ? "min(1040px, calc(100% - 2rem))"
                : "min(1280px, calc(100% - 2rem))",
              margin: scrolled ? "0.75rem auto 0" : "0.5rem auto 0",
              padding: scrolled ? "0.625rem 1.25rem" : "1.25rem 2rem",
              borderRadius: "1rem",
              background: scrolled ? "rgba(7,7,8,0.9)" : "rgba(7,7,8,0.6)",
              border: scrolled
                ? "1px solid rgba(255,255,255,0.09)"
                : "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
            }}
          >
            <BrandLogo />

            <div className="hidden md:flex items-center gap-8 text-sm text-neutral-500">
              {["Features", "Automation"].map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  className="hover:text-white transition-colors duration-200"
                >
                  {l}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                className="btn-ghost text-sm rounded-xl px-4 py-2"
                onClick={() => (window.location.href = "/sign-in")}
              >
                Sign in
              </button>
              <button
                className="btn-primary fd text-xs rounded-xl px-4 py-2 flex items-center gap-1.5"
                onClick={() => (window.location.href = "/sign-up")}
              >
                Start free <ArrowRight className="size-3.5" />
              </button>
            </div>
          </nav>
        </div>

        <section className="relative flex flex-col items-center justify-center min-h-screen pt-36 pb-24 px-5">
          {/* Decorative geometry */}
          <div
            className="absolute top-1/4 left-[6%] size-56 rounded-full float pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.025), transparent 70%)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          />
          <div
            className="absolute bottom-1/4 right-[6%] size-40 float-delay pointer-events-none"
            style={{
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.018), transparent 70%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tx()}
            className="text-center max-w-4xl mx-auto mb-14"
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 text-[10px] font-semibold px-3.5 py-1.5 rounded-full mb-8 uppercase tracking-[0.15em]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: "#fff", opacity: 0.7 }}
              />
              OpenClaw Automation — Now live
            </div>

            <h1
              className="fd font-black leading-[0.9] mb-6"
              style={{
                fontSize: "clamp(2.8rem, 7vw, 6rem)",
                letterSpacing: "-0.04em",
              }}
            >
              Workspaces that stay
              <br />
              <span
                style={{
                  WebkitTextFillColor: "transparent",
                  WebkitTextStroke: "1.5px rgba(255,255,255,0.9)",
                }}
              >
                calm under load.
              </span>
            </h1>

            <p className="text-neutral-500 text-lg leading-relaxed max-w-xl mx-auto mb-10">
              A focused shell for projects, members, tasks, and views — with
              secure OpenClaw automation from Discord, WhatsApp, Telegram &
              Slack.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                className="btn-primary fd text-xs rounded-xl px-7 py-3.5 flex items-center gap-2"
                onClick={() => (window.location.href = "/sign-up")}
              >
                Create workspace free <ArrowRight className="size-4" />
              </button>
              <button
                className="btn-ghost fb text-sm rounded-xl px-6 py-3.5 flex items-center gap-2"
                onClick={() => {
                  const el = document.getElementById("demo");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Play className="size-3.5" />
                Watch demo
              </button>
            </div>

            <p className="text-neutral-700 text-xs mt-5">
              No credit card required · Setup in 2 minutes · Free forever plan
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tx(0.18)}
            className="w-full max-w-5xl mx-auto"
          >
            <div
              className="relative rounded-[2rem] overflow-hidden"
              style={{
                background: "rgba(10,10,12,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow:
                  "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              {/* Gradient top edge */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                }}
              />

              <div className="p-5">
                {/* Window chrome */}
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                        <div
                          key={c}
                          className="size-3 rounded-full"
                          style={{ background: c, opacity: 0.8 }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-600 ml-2">
                      Northstar Launch · 3 members active
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {["Table", "Kanban", "Calendar"].map((v, i) => (
                      <button
                        key={v}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all"
                        style={
                          i === 1
                            ? {
                                background: "rgba(255,255,255,0.08)",
                                color: "#fff",
                                border: "1px solid rgba(255,255,255,0.12)",
                              }
                            : {
                                color: "#555",
                                background: "transparent",
                                border: "1px solid transparent",
                              }
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    ["Total", "128", "+14"],
                    ["In Progress", "34", "+6"],
                    ["Completed", "72", "+9"],
                    ["Overdue", "04", "-2"],
                  ].map(([label, value, diff]) => (
                    <div
                      key={label}
                      className="rounded-xl p-4"
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <p className="text-[10px] text-neutral-600 mb-2 uppercase tracking-wide">
                        {label}
                      </p>
                      <div className="flex items-end justify-between">
                        <span className="fd text-2xl font-bold text-white">
                          {value}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={
                            diff.startsWith("+")
                              ? {
                                  background: "rgba(255,255,255,0.06)",
                                  color: "rgba(255,255,255,0.5)",
                                }
                              : {
                                  background: "rgba(255,80,80,0.1)",
                                  color: "#ff6464",
                                }
                          }
                        >
                          {diff}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { col: "Backlog", n: 3 },
                    { col: "In Progress", n: 3 },
                    { col: "Done", n: 2 },
                  ].map(({ col, n }, ci) => (
                    <div
                      key={col}
                      className="rounded-xl p-3"
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="size-1.5 rounded-full"
                          style={{
                            background:
                              ci === 0
                                ? "#555"
                                : ci === 1
                                  ? "#fff"
                                  : "rgba(255,255,255,0.4)",
                          }}
                        />
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                          {col}
                        </p>
                        <span className="ml-auto text-[10px] text-neutral-700">
                          {n}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: n }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-lg p-3"
                            style={{
                              minHeight: 64,
                              background:
                                ci === 1
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(255,255,255,0.02)",
                              border: `1px solid rgba(255,255,255,${ci === 1 ? "0.07" : "0.04"})`,
                            }}
                          >
                            <div
                              className="h-1.5 rounded-full mb-2"
                              style={{
                                width: `${50 + i * 15}%`,
                                background: "rgba(255,255,255,0.1)",
                              }}
                            />
                            <div
                              className="h-1 rounded-full mb-3"
                              style={{
                                width: `${30 + i * 12}%`,
                                background: "rgba(255,255,255,0.05)",
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1">
                                {Array.from({ length: (i % 2) + 1 }).map(
                                  (_, j) => (
                                    <div
                                      key={j}
                                      className="size-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold"
                                      style={{
                                        background: j === 0 ? "#fff" : "#555",
                                        color: "#000",
                                      }}
                                    >
                                      {String.fromCharCode(65 + ((i + j) % 5))}
                                    </div>
                                  ),
                                )}
                              </div>
                              <CalendarCheck className="size-3 text-neutral-700 ml-auto" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <div
          className="py-12 border-y overflow-hidden"
          style={{ borderColor: BORDER }}
        >
          <p className="fd text-center text-[9px] uppercase tracking-[0.3em] font-semibold text-neutral-700 mb-5">
            Connects with your existing tools
          </p>
          <div className="space-y-3">
            <Marquee />
            <Marquee reverse />
          </div>
        </div>

        <section className="py-24 px-5 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={tx()}
            className="text-center mb-14"
          >
            <p
              className="fd text-[9px] uppercase tracking-[0.3em] font-semibold mb-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Channel bots
            </p>
            <h2
              className="fd font-bold leading-tight mb-5"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Manage tasks from anywhere
              <br />
              <span className="text-neutral-600">your team already lives.</span>
            </h2>
            <p className="text-neutral-500 text-sm max-w-lg mx-auto">
              One workspace token unlocks automation across every channel. No
              extra permissions, no credential juggling.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CHANNELS.map(({ icon: Icon, name, desc }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={tx(i * 0.08)}
              >
                <div
                  className="channel-card rounded-2xl p-6 text-center cursor-default h-full"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div
                    className="size-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <Icon className="size-5 text-white opacity-70" />
                  </div>
                  <p className="fd font-semibold text-sm text-white mb-1">
                    {name}
                  </p>
                  <p className="text-xs text-neutral-600">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="features" className="py-16 px-5 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={tx()}
            className="mb-14"
          >
            <p
              className="fd text-[9px] uppercase tracking-[0.3em] font-semibold mb-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Features
            </p>
            <h2
              className="fd font-bold leading-tight"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Everything your team needs.
              <br />
              <span className="text-neutral-600">Nothing it doesn't.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Hero feature — wide */}
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={tx()}
            >
              <div
                className="feature-card rounded-3xl p-8 h-full cursor-default"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  className="size-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <KanbanSquare className="size-6 text-white opacity-80" />
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-neutral-600 mb-2">
                  Flexible views
                </p>
                <h3
                  className="fd font-bold text-xl mb-3"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Projects that adapt to how you think
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-8">
                  Switch between table, kanban, and calendar without losing
                  context. Filter by assignee, status, or deadline. Your
                  workspace, your workflow — always exactly where you left it.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["Backlog", "Active", "Done"].map((col, ci) => (
                    <div key={col} className="space-y-2">
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-neutral-700 px-1">
                        {col}
                      </div>
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="h-14 rounded-xl"
                          style={{
                            background:
                              ci === 1
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(255,255,255,0.02)",
                            border: `1px solid ${ci === 1 ? "rgba(255,255,255,0.1)" : BORDER}`,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Side stack */}
            <div className="space-y-4">
              {FEATURES.filter((f) => !f.wide)
                .slice(0, 2)
                .map(({ icon: Icon, title, body }, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={tx(0.08 + i * 0.06)}
                  >
                    <div
                      className="feature-card rounded-3xl p-6 cursor-default"
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div
                        className="size-10 rounded-xl flex items-center justify-center mb-4"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <Icon className="size-5 text-neutral-400" />
                      </div>
                      <h3 className="fd font-bold text-sm mb-2">{title}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {body}
                      </p>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Bottom row */}
            {FEATURES.filter((f) => !f.wide)
              .slice(2)
              .map(({ icon: Icon, title, body }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={tx(0.1 + i * 0.07)}
                >
                  <div
                    className="feature-card rounded-3xl p-6 cursor-default"
                    style={{
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      className="size-10 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <Icon className="size-5 text-neutral-400" />
                    </div>
                    <h3 className="fd font-bold text-sm mb-2">{title}</h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {body}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </section>

        <section id="demo" className="py-24 px-5 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={tx()}
            className="text-center mb-12"
          >
            <p
              className="fd text-[9px] uppercase tracking-[0.3em] font-semibold mb-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Product demo
            </p>
            <h2
              className="fd font-bold leading-tight mb-4"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                letterSpacing: "-0.03em",
              }}
            >
              See it in action.
            </h2>
            <p className="text-neutral-500 text-sm max-w-md mx-auto">
              Watch how ManageMe keeps your team calm, aligned, and shipping —
              from setup to daily standups.
            </p>
          </motion.div>

        
 <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={tx(0.1)}
          >
            <div
              className="video-wrapper relative"
              style={{
                background: "#000",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "1.5rem",
                boxShadow:
                  "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
                overflow: "hidden",
              }}
            >
              {/* Top gradient line */}
              <div
                className="absolute top-0 left-0 right-0 h-px z-10"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                }}
              />

              {/* 16:9 aspect ratio container */}
              <div
                style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                }}
              >
             
                <iframe
                  src="https://www.youtube.com/embed/JJ8bBrurmws?rel=0&modestbranding=1&color=white"
                  title="ManageMe product demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              </div>
            </div>
          </motion.div>
          
        </section>

   <section id="automation" className="py-24 px-5 max-w-7xl mx-auto">
  <div className="grid md:grid-cols-2 gap-14 items-center">
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={tx()}
    >
      <p
        className="fd text-[9px] uppercase tracking-[0.3em] font-semibold mb-4"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        OpenClaw Automation
      </p>

      <h2
        className="fd font-bold leading-tight mb-6"
        style={{
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          letterSpacing: "-0.03em",
        }}
      >
        Agents that update your
        <br />
        tasks directly.
      </h2>

      <p className="text-neutral-500 leading-relaxed mb-8 text-sm">
        Your OpenClaw agent uses the ManageMe skill to call our API and manage
        tasks inside your workspace — create, update, complete, and attach files,
        all from chat.
      </p>

      <div className="space-y-3.5">
        {[
          "Secure workspace secret authentication",
          "Direct API calls via OpenClaw skill",
          "Create, update, and complete tasks from chat",
          "Fetch projects and task data in real-time",
          "Upload files before confirming actions",
          "Works with Discord, WhatsApp, Telegram, Slack, and Teams",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div
              className="size-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <CheckCircle2 className="size-3 text-neutral-400" />
            </div>
            <span className="text-sm text-neutral-400">{item}</span>
          </div>
        ))}
      </div>
    </motion.div>

    {/* API example (curl, not SDK) */}
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={tx(0.1)}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#08080c",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: BORDER }}
        >
          <div className="flex gap-1.5">
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div
                key={c}
                className="size-2.5 rounded-full"
                style={{ background: c, opacity: 0.8 }}
              />
            ))}
          </div>
          <Terminal className="size-3.5 text-neutral-700 ml-2" />
          <span className="fm text-[11px] text-neutral-600 ml-1">
            curl request
          </span>
        </div>

        <div className="p-6 fm text-xs leading-7 overflow-x-auto">
          <div className="text-neutral-700">
            {"# Create task via OpenClaw skill"}
          </div>

          <div className="mt-3 text-white">
{`curl -X POST "$MANAGEME_API_URL/api/oc/task?w=$MANAGEME_WORKSPACE_ID" \\
  -H "x-openclaw-secret: $MANAGEME_OPENCLAW_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Review Q4 delivery plan",
    "priority": "high",
    "sourceChannel": "discord"
  }'`}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-neutral-400">✓</span>
            <span className="text-neutral-600">Task created in ManageMe</span>
          </div>
        </div>
      </div>
    </motion.div>
  </div>
</section>

        <div className="border-y py-20 px-5" style={{ borderColor: BORDER }}>
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, suffix, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={tx(i * 0.08)}
                className="text-center"
              >
                <p
                  className="fd font-black mb-2"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3.5rem)",
                    letterSpacing: "-0.04em",
                  }}
                >
                  <CountUp to={value} />
                  <span className="text-neutral-600">{suffix}</span>
                </p>
                <p className="text-sm text-neutral-600">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <section className="py-24 px-5 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={tx()}
            className="text-center mb-16"
          >
            <p
              className="fd text-[9px] uppercase tracking-[0.3em] font-semibold mb-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              How it works
            </p>
            <h2
              className="fd font-bold"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Up and running in minutes.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {HOW.map(({ n, title, body }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={tx(i * 0.1)}
              >
                <div
                  className="feature-card rounded-3xl p-8 h-full cursor-default"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <span
                    className="fd font-black block mb-4 leading-none"
                    style={{
                      fontSize: "5rem",
                      color: "rgba(255,255,255,0.04)",
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {n}
                  </span>
                  <h3
                    className="fd font-bold text-lg mb-3"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>


       

        <footer className="py-14 px-5 border-t" style={{ borderColor: BORDER }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div>
              <BrandLogo />
              <p className="text-xs text-neutral-700 mt-2 max-w-xs leading-relaxed">
                A focused workspace shell for projects, members, and tasks with
                secure multi-channel automation.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-3 text-sm text-neutral-600">
              {[
                "Features",
                "Automation",
                "Pricing",
                "Docs",
                "Blog",
                "Changelog",
                "Privacy",
                "Terms",
              ].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
          <div
            className="max-w-7xl mx-auto mt-10 pt-6 border-t flex items-center justify-between text-xs text-neutral-800"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-2">
              <Layers3 className="size-3.5" />
              <span>ManageMe — monochrome product experience</span>
            </div>
            <span>© 2025 ManageMe</span>
          </div>
        </footer>
      </main>
    </>
  );
}

