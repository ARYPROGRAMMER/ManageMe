"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type PlatformId = "telegram" | "slack" | "discord" | "whatsapp" | "signal";
type OpenClawStatus = "unknown" | "connected" | "disconnected";

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
    difficultyClassName: "bg-green-100 text-green-800",
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
    difficultyClassName: "bg-green-100 text-green-800",
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
    difficultyClassName: "bg-yellow-100 text-yellow-800",
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
    difficultyClassName: "bg-red-100 text-red-800",
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
    difficultyClassName: "bg-red-100 text-red-800",
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

  const connectPlatform = async (platform: PlatformId) => {
    const credential = credentials[platform]?.trim();
    if (!credential) {
      toast.error("Please enter the credential first.");
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

    const channels: Record<string, any> = {};

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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Connect Platforms</h1>
        <p className="text-muted-foreground mt-1">
          Configure OpenClaw integrations for Discord, Telegram, Slack, and
          more.
        </p>
      </div>

      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const isConnectable = CONNECTABLE_PLATFORMS.includes(platform.id);
          const isConnected = connected[platform.id];
          const isLoading = loading[platform.id];

          return (
            <Card key={platform.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{platform.name}</CardTitle>
                  <Badge className={platform.difficultyClassName}>
                    {platform.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {platform.description}
                </p>
              </CardHeader>
              <CardContent>
                <ol className="text-sm text-muted-foreground space-y-1 mb-4 list-decimal pl-5">
                  {platform.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>

                <p className="text-xs font-medium mb-2">{platform.credLabel}</p>
                <div className="flex gap-2">
                  <Input
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

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">OpenClaw Power Mode</CardTitle>
            <div className="flex items-center gap-2">
              {openclawStatus === "connected" && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Connected
                </span>
              )}
              {openclawStatus === "disconnected" && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Not reachable
                </span>
              )}
              {openclawStatus === "unknown" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
          <div className="bg-muted rounded-md p-3 font-mono text-sm space-y-1">
            <p>1. Install OpenClaw on your machine</p>
            <p>2. Download config from below</p>
            <p>3. Save as ~/.openclaw/openclaw.json</p>
            <p>4. Put manageme.skill.md beside config</p>
            <p>5. Run: openclaw start</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={downloadOpenClawConfig}
              variant="outline"
              className="flex-1"
            >
              Download openclaw.json
            </Button>
            <Button
              onClick={() => void checkOpenClawStatus()}
              variant="ghost"
              size="sm"
            >
              Check status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
