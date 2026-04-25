"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../schemas";
import { useRegister } from "../api/use-register";
import { signUpWithGithub, signUpWithGoogle } from "@/lib/oauth";
import { LoaderCircle } from "lucide-react";

/* ─── Precision reticle – placed bottom-left ─────────────────── */
const Reticle = ({ style }: { style?: React.CSSProperties }) => (
  <svg aria-hidden viewBox="0 0 120 120" fill="none" style={style}>
    <circle cx="60" cy="60" r="54" stroke="white" strokeWidth="0.35" />
    <circle cx="60" cy="60" r="36" stroke="white" strokeWidth="0.35" />
    <circle cx="60" cy="60" r="18" stroke="white" strokeWidth="0.35" />
    <circle cx="60" cy="60" r="4"  stroke="white" strokeWidth="0.5"  />
    <line x1="60" y1="2"   x2="60" y2="40"  stroke="white" strokeWidth="0.35" />
    <line x1="60" y1="80"  x2="60" y2="118" stroke="white" strokeWidth="0.35" />
    <line x1="2"  y1="60"  x2="40"  y2="60" stroke="white" strokeWidth="0.35" />
    <line x1="80" y1="60"  x2="118" y2="60" stroke="white" strokeWidth="0.35" />
    <line x1="21" y1="21"  x2="28"  y2="28" stroke="white" strokeWidth="0.35" />
    <line x1="99" y1="21"  x2="92"  y2="28" stroke="white" strokeWidth="0.35" />
    <line x1="21" y1="99"  x2="28"  y2="92" stroke="white" strokeWidth="0.35" />
    <line x1="99" y1="99"  x2="92"  y2="92" stroke="white" strokeWidth="0.35" />
  </svg>
);

/* ─── Target/bullseye icon for sign-up badge ─────────────────── */
const TargetIcon = () => (
  <svg viewBox="0 0 22 22" fill="none" style={{ width: 20, height: 20 }}>
    <circle cx="11" cy="11" r="9"   stroke="white" strokeWidth="1.2" />
    <circle cx="11" cy="11" r="5.5" stroke="white" strokeWidth="1.2" />
    <circle cx="11" cy="11" r="2"   fill="white"   opacity="0.8"     />
    {/* small dart tip approaching */}
    <line x1="17.5" y1="4.5" x2="12.5" y2="9.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/* ─── Shared design tokens (mirrors sign-in-card) ────────────── */
const T = {
  card: {
    background: "linear-gradient(170deg,#141417 0%,#0f0f12 55%,#0c0c0e 100%)",
    borderRadius: "1.4rem",
    border: "none",
    boxShadow: [
      "0 0 0 1px rgba(255,255,255,0.06)",
      "inset 0 1px 0 rgba(255,255,255,0.075)",
      "inset 0 -1px 0 rgba(0,0,0,0.6)",
      "0 2px 4px rgba(0,0,0,0.4)",
      "0 20px 60px rgba(0,0,0,0.8)",
      "0 60px 120px rgba(0,0,0,0.6)",
    ].join(","),
    overflow: "hidden",
    position: "relative" as const,
  },
  input: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.075)",
    borderRadius: "0.55rem",
    color: "#ddd",
    height: "2.7rem",
    fontSize: "0.83rem",
    paddingLeft: "0.85rem",
    letterSpacing: "0.01em",
    boxShadow: "inset 0 2px 5px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.025)",
    outline: "none",
  } as React.CSSProperties,
  primaryBtn: {
    background: "#f0f0f0",
    color: "#0c0c0e",
    border: "none",
    borderRadius: "0.55rem",
    height: "2.7rem",
    width: "100%",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    boxShadow: [
      "0 1px 0 rgba(255,255,255,0.8) inset",
      "0 6px 20px rgba(0,0,0,0.55)",
    ].join(","),
    transition: "transform 0.12s, opacity 0.12s",
  } as React.CSSProperties,
  ghostBtn: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "0.55rem",
    height: "2.7rem",
    width: "100%",
    fontSize: "0.82rem",
    fontWeight: 500,
    color: "#888",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.55rem",
    transition: "background 0.12s, border-color 0.12s",
  } as React.CSSProperties,
  rule: {
    height: 1,
    background:
      "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.065) 25%,rgba(255,255,255,0.065) 75%,transparent 100%)",
  } as React.CSSProperties,
};

const FIELDS = [
  { name: "name"     as const, type: "text",     placeholder: "Full name"      },
  { name: "email"    as const, type: "email",    placeholder: "Email address"  },
  { name: "password" as const, type: "password", placeholder: "Password"       },
];

/* ══════════════════════════════════════════════════════════════ */

export const SignUpCard = () => {
  const { mutate, isPending } = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    mutate({ json: values });
  };

  return (
    <Card className="w-full max-w-[440px]" style={T.card}>

      {/* ── Background reticle (opposite corner to sign-in) ───── */}
      <Reticle
        style={{
          position: "absolute",
          bottom: -72,
          left: -72,
          width: 230,
          opacity: 0.026,
          pointerEvents: "none",
        }}
      />

      {/* ── Noise grain ───────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
          opacity: 0.018,
          mixBlendMode: "overlay" as const,
          pointerEvents: "none",
        }}
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <CardHeader
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2.25rem 2.25rem 1.6rem",
          textAlign: "center",
          gap: 0,
        }}
      >
        {/* Badge */}
        <div
          style={{
            marginBottom: "1.2rem",
            width: 46,
            height: 46,
            borderRadius: "0.8rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(150deg,#1f1f23 0%,#17171a 100%)",
            boxShadow: [
              "0 0 0 1px rgba(255,255,255,0.08)",
              "inset 0 1px 0 rgba(255,255,255,0.07)",
              "0 4px 16px rgba(0,0,0,0.6)",
            ].join(","),
          }}
        >
          <TargetIcon />
        </div>

        {/* Eyebrow pill */}
        <div
          style={{
            marginBottom: "0.6rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.18rem 0.6rem",
            borderRadius: 99,
            border: "1px solid rgba(255,255,255,0.075)",
            background: "rgba(255,255,255,0.025)",
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.45)",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.66rem",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            New account
          </span>
        </div>

        <CardTitle
          style={{
            fontSize: "1.7rem",
            fontWeight: 700,
            color: "#ebebeb",
            letterSpacing: "-0.04em",
            lineHeight: 1.15,
          }}
        >
          Create account
        </CardTitle>
        <p
          style={{
            marginTop: "0.45rem",
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.25)",
            lineHeight: 1.65,
            maxWidth: 280,
          }}
        >
          By signing up you agree to our{" "}
          <Link href="/privacy">
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                textDecorationColor: "rgba(255,255,255,0.18)",
              }}
            >
              Privacy Policy
            </span>
          </Link>{" "}
          and{" "}
          <Link href="/terms">
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                textDecorationColor: "rgba(255,255,255,0.18)",
              }}
            >
              Terms of Service
            </span>
          </Link>
          .
        </p>
      </CardHeader>

      <div style={{ padding: "0 2.1rem" }}>
        <div style={T.rule} />
      </div>

      {/* ── Form ──────────────────────────────────────────────── */}
      <CardContent style={{ padding: "1.6rem 2.1rem" }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {FIELDS.map((f) => (
              <FormField
                key={f.name}
                name={f.name}
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type={f.type}
                        placeholder={f.placeholder}
                        style={T.input}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div style={{ paddingTop: "0.4rem" }}>
              <Button
                disabled={isPending}
                size="lg"
                style={T.primaryBtn}
                className="hover:-translate-y-px hover:opacity-95 active:translate-y-0"
              >
                {isPending && (
                  <LoaderCircle
                    className="animate-spin mr-2"
                    style={{ width: 14, height: 14, color: "#0c0c0e" }}
                  />
                )}
                Create account
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* ── "Or" divider ──────────────────────────────────────── */}
      <div
        style={{
          padding: "0 2.1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
        }}
      >
        <div style={{ flex: 1, ...T.rule }} />
        <span
          style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          or
        </span>
        <div style={{ flex: 1, ...T.rule }} />
      </div>

      {/* ── OAuth buttons ─────────────────────────────────────── */}
      <CardContent
        style={{
          padding: "1.4rem 2.1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
        }}
      >
        <Button
          onClick={() => signUpWithGoogle()}
          disabled={isPending}
          variant="secondary"
          size="lg"
          style={T.ghostBtn}
          className="hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-white/70"
        >
          <FcGoogle style={{ width: 16, height: 16 }} />
          Continue with Google
        </Button>

        <Button
          onClick={() => signUpWithGithub()}
          disabled={isPending}
          variant="secondary"
          size="lg"
          style={T.ghostBtn}
          className="hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-white/70"
        >
          <FaGithub style={{ width: 16, height: 16, color: "#aaa" }} />
          Continue with GitHub
        </Button>
      </CardContent>

      <div style={{ padding: "0 2.1rem" }}>
        <div style={T.rule} />
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <CardContent
        style={{
          padding: "1.1rem 2.1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.22)" }}>
          Already have an account?{" "}
          <Link href="/sign-in">
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontWeight: 500,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                textDecorationColor: "rgba(255,255,255,0.18)",
              }}
            >
              Sign in
            </span>
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};