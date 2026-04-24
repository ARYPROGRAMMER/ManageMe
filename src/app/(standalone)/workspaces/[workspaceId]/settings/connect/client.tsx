"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  PlugZap,
  ShieldCheck,
} from "lucide-react";

type PlatformId = "telegram" | "slack" | "discord" | "whatsapp" | "signal";
type OpenClawStatus = "unknown" | "connected" | "disconnected";
type ConnectablePlatformId = "telegram" | "slack" | "discord";
type OpenClawChannelConfig = {
  enabled: boolean;
  botToken?: string;
  credential?: string;
};

const CONNECTABLE_PLATFORMS: PlatformId[] = ["telegram", "slack", "discord"];

const PLATFORMS: {
  id: PlatformId;
  name: string;
  difficulty: string;
  difficultyClassName: string;
  description: string;
  steps: string[];
  credLabel: string;
  credPlaceholder: string;
}[] = [
  {
    id: "discord",
    name: "Discord",
    difficulty: "Easy",
    difficultyClassName:
      "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    description:
      "Connect your Discord channel credential for OpenClaw task automation.",
    steps: [
      "Create your bot/app in discord.com/developers",
      "Copy your Discord bot token credential",
      "Paste it below and connect",
    ],
    credLabel: "Discord Bot Token",
    credPlaceholder: "MTIzNDU2...",
  },
  {
    id: "telegram",
    name: "Telegram",
    difficulty: "Easy",
    difficultyClassName:
      "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    description:
      "Add your Telegram bot token for OpenClaw so messages create and update tasks.",
    steps: [
      "Open Telegram and search @BotFather",
      "Run /newbot and copy your API token",
      "Paste it below and connect",
    ],
    credLabel: "Telegram Bot Token",
    credPlaceholder: "1234567890:ABCdefGHIjklMNOpqrSTUVwxyz",
  },
  {
    id: "slack",
    name: "Slack",
    difficulty: "Medium",
    difficultyClassName: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    description:
      "Store your Slack credential for OpenClaw task automation from Slack messages.",
    steps: [
      "Create a Slack app at api.slack.com/apps",
      "Generate your bot token / webhook credential",
      "Paste it below and connect",
    ],
    credLabel: "Slack Credential",
    credPlaceholder: "xoxb-... or webhook URL",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    difficulty: "Hard",
    difficultyClassName: "border-red-300/25 bg-red-300/10 text-red-100",
    description:
      "WhatsApp requires local channel/plugin setup in OpenClaw and is configured manually.",
    steps: [
      "Set up WhatsApp provider locally in OpenClaw",
      "Map credentials directly in your local channel config",
    ],
    credLabel: "Local Setup Only",
    credPlaceholder: "Configured in local OpenClaw channel setup",
  },
  {
    id: "signal",
    name: "Signal",
    difficulty: "Hard",
    difficultyClassName: "border-red-300/25 bg-red-300/10 text-red-100",
    description:
      "Signal is configured through OpenClaw local channel plugin/session setup.",
    steps: [
      "Enable Signal channel in local OpenClaw config",
      "Provide Signal session details locally",
    ],
    credLabel: "Local Setup Only",
    credPlaceholder: "Configured in local OpenClaw channel setup",
  },
];

export const ConnectPlatformsClient = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [openclawSecret, setOpenclawSecret] = useState("");
  const [openclawStatus, setOpenclawStatus] =
    useState<OpenClawStatus>("unknown");
  const [providerId, setProviderId] = useState("google");
  const [modelRef, setModelRef] = useState("google/gemini-3-flash-preview");
  const [providerAuthField, setProviderAuthField] = useState("apiKey");
  const [providerApiEnvVar, setProviderApiEnvVar] = useState("GEMINI_API_KEY");

  const copySecret = async () => {
    if (!openclawSecret) {
      toast.error("No secret available yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(openclawSecret);
      toast.success("OpenClaw secret copied.");
    } catch {
      toast.error("Could not copy secret to clipboard.");
    }
  };

  const getCredentialInputType = (platform: PlatformId) => {
    if (platform === "slack") {
      return "text";
    }

    return "password";
  };

  const validateCredential = (
    platform: ConnectablePlatformId,
    credential: string,
  ) => {
    if (!credential.trim()) {
      return "Please enter the credential first.";
    }

    if (platform === "telegram" && !credential.includes(":")) {
      return "Telegram token format looks invalid.";
    }

    if (platform === "discord" && credential.trim().length < 20) {
      return "Discord bot token looks too short.";
    }

    return null;
  };

  const loadIntegration = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/oc/integrations?workspaceId=${workspaceId}`,
      );
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please sign in again to load integrations.");
        }
        return;
      }

      const { data } = await res.json();
      const loadedCredentials = {
        telegram: data?.credentials?.telegram ?? "",
        discord: data?.credentials?.discord ?? "",
        slack: data?.credentials?.slack ?? "",
      };

      setCredentials((prev) => ({ ...prev, ...loadedCredentials }));
      setOpenclawSecret(data?.openclawSecret ?? "");
      setConnected({
        telegram: Boolean(loadedCredentials.telegram),
        discord: Boolean(loadedCredentials.discord),
        slack: Boolean(loadedCredentials.slack),
      });
    } catch {
      toast.error("Could not load existing integration settings.");
    }
  }, [workspaceId]);

  const checkOpenClawStatus = useCallback(async () => {
    if (!openclawSecret) {
      setOpenclawStatus("unknown");
      return;
    }

    try {
      const res = await fetch(`/api/oc/ping?w=${workspaceId}`, {
        headers: { "x-openclaw-secret": openclawSecret },
      });
      setOpenclawStatus(res.ok ? "connected" : "disconnected");
    } catch {
      setOpenclawStatus("disconnected");
    }
  }, [openclawSecret, workspaceId]);

  useEffect(() => {
    void loadIntegration();
  }, [loadIntegration]);

  useEffect(() => {
    if (!openclawSecret) {
      setOpenclawStatus("unknown");
      return;
    }

    void checkOpenClawStatus();
    const intervalId = window.setInterval(() => {
      void checkOpenClawStatus();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [openclawSecret, checkOpenClawStatus]);

  const connectPlatform = async (platform: ConnectablePlatformId) => {
    const credential = credentials[platform]?.trim();
    const validationError = validateCredential(platform, credential ?? "");

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading((prev) => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch("/api/oc/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          platform,
          credential,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Connection failed.");
        return;
      }

      setConnected((prev) => ({ ...prev, [platform]: true }));
      setOpenclawSecret(data.openclawSecret ?? "");
      toast.success(
        `${platform[0].toUpperCase()}${platform.slice(1)} connected.`,
      );
    } catch {
      toast.error("Connection failed.");
    } finally {
      setLoading((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const downloadOpenClawConfig = () => {
    if (!openclawSecret) {
      toast.error(
        "Connect at least one platform first to generate your secret.",
      );
      return;
    }

    const channels: Partial<
      Record<ConnectablePlatformId, OpenClawChannelConfig>
    > = {};

    if (credentials.telegram) {
      channels.telegram = {
        enabled: true,
        botToken: credentials.telegram,
      };
    }

    if (credentials.discord) {
      channels.discord = {
        enabled: true,
        botToken: credentials.discord,
      };
    }

    if (credentials.slack) {
      channels.slack = {
        enabled: true,
        credential: credentials.slack,
      };
    }

    const safeProviderId = providerId.trim() || "google";
    const safeModelRef = modelRef.trim() || "google/gemini-3-flash-preview";
    const safeProviderAuthField = providerAuthField.trim() || "apiKey";
    const safeProviderApiEnvVar = providerApiEnvVar.trim() || "MODEL_API_KEY";

    const config = {
      gateway: { port: 18789, model: safeModelRef },
      providers: {
        [safeProviderId]: {
          [safeProviderAuthField]: `\${${safeProviderApiEnvVar}}`,
        },
      },
      channels,
      skills: [
        {
          path: "./manageme.skill.md",
          name: "manageme",
          env: {
            MANAGEME_API_URL: window.location.origin,
            MANAGEME_OPENCLAW_SECRET: openclawSecret,
            MANAGEME_WORKSPACE_ID: workspaceId,
          },
        },
      ],
      cron: [
        {
          schedule: "0 8 * * *",
          message:
            "Run the morning briefing cron task from the manageme skill.",
        },
        {
          schedule: "0 * * * *",
          message: "Run the due-soon reminder check from the manageme skill.",
        },
        {
          schedule: "0 18 * * *",
          message: "Run the evening wrap-up cron task from the manageme skill.",
        },
      ],
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "openclaw.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Config downloaded.");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="glass-panel mb-6 rounded-3xl p-6">
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <PlugZap className="size-6 text-neutral-200" />
        </div>
        <h1 className="text-3xl font-bold text-white">Connect Platforms</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Configure OpenClaw integrations for Discord, Telegram, Slack, and
          more.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">OpenClaw-first workflow</Badge>
          <Badge variant="secondary">Secure workspace secret</Badge>
          <Badge variant="secondary">Production-ready API routes</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const isConnectable = CONNECTABLE_PLATFORMS.includes(platform.id);
          const isConnected = connected[platform.id];
          const isLoading = loading[platform.id];

          return (
            <Card key={platform.id} className="glass-panel rounded-3xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Bot className="size-4 text-neutral-400" />
                    {platform.name}
                  </CardTitle>
                  <Badge className={platform.difficultyClassName}>
                    {platform.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {platform.description}
                </p>
                {platform.id === "discord" && (
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-300 transition hover:text-white"
                  >
                    Open Discord developer portal
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </CardHeader>
              <CardContent>
                <ol className="mb-4 space-y-2 text-sm text-muted-foreground">
                  {platform.steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[10px] text-neutral-300">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                  {platform.credLabel}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type={getCredentialInputType(platform.id)}
                    placeholder={platform.credPlaceholder}
                    value={credentials[platform.id] ?? ""}
                    onChange={(event) =>
                      setCredentials((prev) => ({
                        ...prev,
                        [platform.id]: event.target.value,
                      }))
                    }
                    disabled={!isConnectable || isConnected}
                    className="flex-1 font-mono text-sm"
                  />
                  {isConnectable && (
                    <Button
                      onClick={() => void connectPlatform(platform.id)}
                      disabled={isLoading || isConnected}
                      variant={isConnected ? "outline" : "primary"}
                      size="sm"
                    >
                      {isLoading
                        ? "Connecting..."
                        : isConnected
                          ? "Connected"
                          : "Connect"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-panel-strong mt-6 rounded-3xl border-dashed border-white/15">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <ShieldCheck className="size-5 text-neutral-300" />
              OpenClaw Power Mode
            </CardTitle>
            <div className="flex items-center gap-2">
              {openclawStatus === "connected" && (
                <span className="flex items-center gap-1 text-xs text-emerald-200">
                  <span className="inline-block size-2 rounded-full bg-emerald-300" />
                  Connected
                </span>
              )}
              {openclawStatus === "disconnected" && (
                <span className="flex items-center gap-1 text-xs text-red-200">
                  <span className="inline-block size-2 rounded-full bg-red-300" />
                  Not reachable
                </span>
              )}
              {openclawStatus === "unknown" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-neutral-500" />
                  Unknown
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Download your pre-filled config with workspace id + OpenClaw secret
            and run OpenClaw locally.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Workspace Secret
              </p>
              <p className="mt-1 font-mono text-sm text-neutral-200">
                {openclawSecret
                  ? `${openclawSecret.slice(0, 8)}...${openclawSecret.slice(-6)}`
                  : "Generated after first platform connection"}
              </p>
            </div>
            <Button onClick={() => void copySecret()} variant="muted" size="sm">
              <Copy className="size-4" />
              Copy secret
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              placeholder="Provider id (example: google)"
            />
            <Input
              value={modelRef}
              onChange={(event) => setModelRef(event.target.value)}
              placeholder="Model ref (example: google/gemini-3-flash-preview)"
            />
            <Input
              value={providerAuthField}
              onChange={(event) => setProviderAuthField(event.target.value)}
              placeholder="Provider auth field (example: apiKey)"
            />
            <Input
              value={providerApiEnvVar}
              onChange={(event) => setProviderApiEnvVar(event.target.value)}
              placeholder="Env var name (example: GEMINI_API_KEY)"
            />
          </div>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-mono text-sm text-neutral-300">
            <p>1. Install OpenClaw on your machine</p>
            <p>2. Download config from below</p>
            <p>3. Save as ~/.openclaw/openclaw.json</p>
            <p>4. Put manageme.skill.md beside config</p>
            <p>5. Run: openclaw start</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={downloadOpenClawConfig}
              variant="outline"
              className="flex-1"
            >
              <Download className="size-4" />
              Download openclaw.json
            </Button>
            <Button
              onClick={() => void checkOpenClawStatus()}
              variant="ghost"
              size="sm"
            >
              <CheckCircle2 className="size-4" />
              Check status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
