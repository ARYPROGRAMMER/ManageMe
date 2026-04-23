# ManageMe × OpenClaw — Full Implementation Spec

Everywhere the name of product is ManageMe.
I only want the OpenClaw mode of implementation
I want to start with discord complete testing then telegram testing
No extra changes or md files
one md file after everything to setup openclaw , envs , appwrite , bot for discord then telegram - complete but no bluff

> **Instructions for AI implementing this:**  
> This document is a complete implementation spec. Read all sections before writing any code.  
> The existing codebase is at https://github.com/ARYPROGRAMMER/manageme — a Next.js 14 App Router  
> app using Appwrite, Hono, React Query, Zod, Tailwind, shadcn/ui.  
> Do not break existing functionality. Add everything as new files and new routes unless explicitly told to modify.

---

## Table of Contents

1. [What we are building](#1-what-we-are-building)
2. [Appwrite schema changes](#2-appwrite-schema-changes)
3. [New environment variables](#3-new-environment-variables)
4. [New API routes (Hono)](#4-new-api-routes-hono)
5. [Telegram webhook handler](#5-telegram-webhook-handler)
6. [OpenClaw skill file](#6-openclaw-skill-file)
7. [OpenClaw config template](#7-openclaw-config-template)
8. [Platform onboarding UI](#8-platform-onboarding-ui)
9. [Task card updates](#9-task-card-updates)
10. [Cron reminder endpoint](#10-cron-reminder-endpoint)
11. [File structure summary](#11-file-structure-summary)
12. [Integration checklist](#12-integration-checklist)

---

## 1. What We Are Building

ManageMe already has: workspaces, projects, members, CRUD todos, drag-drop.

We are adding **only 1 mode of AI-powered task management via messaging platforms**:

### Mode 1 — Zero-install (Telegram webhook, runs on Vercel)

User pastes their Telegram bot token in ManageMe settings. ManageMe registers a webhook with Telegram. Every message the user sends to their bot arrives at our Vercel API, gets parsed by Claude (Haiku), and creates/updates tasks in Appwrite. No OpenClaw needed. Works for all users out of the box.

```
User's phone (Telegram)
      ↓  message
Telegram servers
      ↓  POST webhook
Vercel API /api/telegram/webhook
      ↓  parse with Claude Haiku
Appwrite DB (create/update task)
      ↓
ManageMe dashboard (real-time update via React Query invalidation)
```

### Mode 2 — Power mode (OpenClaw, runs locally)

A technical user installs OpenClaw, downloads a pre-filled config from ManageMe, and gets multi-platform support (WhatsApp + Telegram + Slack + Discord + Signal simultaneously), voice note transcription, cron reminders, and browser automation — all routing to the same ManageMe API.

```
User's phone (WhatsApp / Telegram / Slack / Discord)
      ↓  message / voice note / PDF / image
OpenClaw Gateway (user's laptop/server)
      ↓  reads manageme.skill.md
      ↓  POST /api/oc/task (or /api/oc/resource etc)
ManageMe Vercel API
      ↓
Appwrite DB
      ↓
ManageMe dashboard
```

Both modes share the same `/api/oc/*` routes. The only difference is _who_ calls them — Vercel's own Telegram webhook (Mode 1) or the user's local OpenClaw gateway (Mode 2).

---

## 2. Appwrite Schema Changes

Add the following attributes to the **existing tasks collection**. Do not remove any existing attributes.

| Attribute     | Type     | Required | Default  | Notes                                                         |
| ------------- | -------- | -------- | -------- | ------------------------------------------------------------- |
| `status`      | Enum     | Yes      | `todo`   | Values: `todo`, `in_progress`, `done`                         |
| `priority`    | Enum     | No       | `medium` | Values: `low`, `medium`, `high`                               |
| `dueDate`     | Datetime | No       | —        | ISO 8601                                                      |
| `completedAt` | Datetime | No       | —        | Set when status → done                                        |
| `createdVia`  | String   | No       | `web`    | `web`, `telegram`, `whatsapp`, `slack`, `discord`, `openclaw` |
| `resources`   | String[] | No       | []       | JSON strings: `{fileId,fileName,mimeType,transcription?}`     |
| `assigneeId`  | String   | No       | —        | Appwrite user ID                                              |
| `description` | String   | No       | —        | Max 5000 chars                                                |

Add a new **workspace_integrations** collection with these attributes:

| Attribute           | Type     | Required | Notes                                  |
| ------------------- | -------- | -------- | -------------------------------------- |
| `workspaceId`       | String   | Yes      | References workspaces collection       |
| `telegramBotToken`  | String   | No       | Encrypted at rest ideally              |
| `telegramChatId`    | String   | No       | The chat/group that registered         |
| `slackWebhookUrl`   | String   | No       |                                        |
| `discordWebhookUrl` | String   | No       |                                        |
| `openclawSecret`    | String   | No       | Random UUID generated on setup         |
| `openclawEnabled`   | Boolean  | No       | Default false                          |
| `platforms`         | String[] | No       | Active platforms: ["telegram","slack"] |

Add to **`src/config.ts`**:

```typescript
export const WORKSPACE_INTEGRATIONS_ID =
  process.env.NEXT_PUBLIC_APPWRITE_INTEGRATIONS_ID!;
export const FILES_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID!;
```

---

## 3. New Environment Variables

Add to `.env.local` and Vercel environment:

```env
# OpenClaw / messaging integration
OPENCLAW_MASTER_SECRET=generate-a-long-random-string-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Appwrite (new collections)
NEXT_PUBLIC_APPWRITE_INTEGRATIONS_ID=your-integrations-collection-id
NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID=your-files-bucket-id

# Cron secret (for Vercel cron jobs)
CRON_SECRET=another-random-string
```

---

## 4. New API Routes (Hono)

### 4a. Create the OpenClaw router file

**File: `src/features/openclaw/server/route.ts`**

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import {
  DATABASE_ID,
  WORKSPACE_INTEGRATIONS_ID,
  FILES_BUCKET_ID,
} from "@/config";
// Import the tasks collection ID — use whatever constant name already exists in config.ts

const app = new Hono();

// ─── Auth middleware ───────────────────────────────────────────────
// Validates x-openclaw-secret header against the workspace's stored secret
app.use("*", async (c, next) => {
  const secret = c.req.header("x-openclaw-secret");
  if (!secret) return c.json({ error: "missing secret" }, 401);

  const workspaceId = c.req.query("w") ?? c.req.header("x-workspace-id");
  if (!workspaceId) return c.json({ error: "missing workspaceId" }, 400);

  const { databases } = await createAdminClient();
  const integrations = await databases.listDocuments(
    DATABASE_ID,
    WORKSPACE_INTEGRATIONS_ID,
    [Query.equal("workspaceId", workspaceId)],
  );

  if (!integrations.total) return c.json({ error: "workspace not found" }, 404);

  const integration = integrations.documents[0];
  if (integration.openclawSecret !== secret) {
    return c.json({ error: "invalid secret" }, 401);
  }

  // Attach workspaceId to context for downstream handlers
  c.set("workspaceId", workspaceId);
  c.set("integration", integration);
  await next();
});

// ─── GET /api/oc/ping ─────────────────────────────────────────────
// OpenClaw calls this on startup to confirm connectivity
app.get("/ping", (c) => {
  return c.json({ ok: true, workspace: c.get("workspaceId"), ts: Date.now() });
});

// ─── POST /api/oc/task ────────────────────────────────────────────
app.post(
  "/task",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(5000).optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      projectId: z.string().optional(),
      assigneeId: z.string().optional(),
      sourceChannel: z.string().optional(),
    }),
  ),
  async (c) => {
    const workspaceId = c.get("workspaceId") as string;
    const data = c.req.valid("json");
    const { databases } = await createAdminClient();

    // Use your existing TASKS_ID constant name from config.ts
    const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;

    const task = await databases.createDocument(
      DATABASE_ID,
      TASKS_COLLECTION,
      ID.unique(),
      {
        workspaceId,
        title: data.title,
        description: data.description ?? "",
        dueDate: data.dueDate ?? null,
        priority: data.priority,
        status: "todo",
        projectId: data.projectId ?? null,
        assigneeId: data.assigneeId ?? null,
        createdVia: data.sourceChannel ?? "openclaw",
        resources: [],
      },
    );

    return c.json({
      success: true,
      taskId: task.$id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
    });
  },
);

// ─── GET /api/oc/tasks ────────────────────────────────────────────
app.get("/tasks", async (c) => {
  const workspaceId = c.get("workspaceId") as string;
  const status = c.req.query("status") ?? "all";
  const projectId = c.req.query("projectId");
  const dueWithin = c.req.query("dueWithin"); // e.g. "1h", "24h"

  const { databases } = await createAdminClient();
  const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;

  const queries: string[] = [Query.equal("workspaceId", workspaceId)];

  if (status !== "all") {
    queries.push(Query.equal("status", status));
  }
  if (projectId) {
    queries.push(Query.equal("projectId", projectId));
  }
  if (dueWithin) {
    const hours = parseInt(dueWithin.replace("h", ""));
    const cutoff = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    queries.push(Query.lessThanEqual("dueDate", cutoff));
    queries.push(Query.equal("status", "todo"));
  }

  queries.push(Query.orderAsc("dueDate"));
  queries.push(Query.limit(50));

  const result = await databases.listDocuments(
    DATABASE_ID,
    TASKS_COLLECTION,
    queries,
  );

  return c.json({
    total: result.total,
    tasks: result.documents.map((t) => ({
      id: t.$id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      projectId: t.projectId,
      createdVia: t.createdVia,
    })),
  });
});

// ─── PATCH /api/oc/task/:id/complete ─────────────────────────────
app.patch("/task/:id/complete", async (c) => {
  const taskId = c.req.param("id");
  const { databases } = await createAdminClient();
  const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;

  await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION, taskId, {
    status: "done",
    completedAt: new Date().toISOString(),
  });

  return c.json({ success: true, taskId });
});

// ─── PATCH /api/oc/task/:id/status ───────────────────────────────
app.patch(
  "/task/:id/status",
  zValidator(
    "json",
    z.object({ status: z.enum(["todo", "in_progress", "done"]) }),
  ),
  async (c) => {
    const taskId = c.req.param("id");
    const { status } = c.req.valid("json");
    const { databases } = await createAdminClient();
    const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;

    await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION, taskId, {
      status,
      ...(status === "done" ? { completedAt: new Date().toISOString() } : {}),
    });

    return c.json({ success: true, taskId, status });
  },
);

// ─── POST /api/oc/resource ────────────────────────────────────────
// Accepts base64 file, stores in Appwrite Storage, optionally attaches to task
app.post(
  "/resource",
  zValidator(
    "json",
    z.object({
      fileName: z.string(),
      mimeType: z.string(),
      base64Data: z.string(),
      taskId: z.string().optional(),
      transcription: z.string().optional(),
    }),
  ),
  async (c) => {
    const workspaceId = c.get("workspaceId") as string;
    const { fileName, mimeType, base64Data, taskId, transcription } =
      c.req.valid("json");

    const { storage, databases } = await createAdminClient();

    // Decode base64 → buffer → File
    const buffer = Buffer.from(base64Data, "base64");
    const file = await storage.createFile(
      FILES_BUCKET_ID,
      ID.unique(),
      new File([buffer], fileName, { type: mimeType }),
    );

    // If a taskId was given, attach the resource to that task
    if (taskId) {
      const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;
      const task = await databases.getDocument(
        DATABASE_ID,
        TASKS_COLLECTION,
        taskId,
      );
      const existing: string[] = task.resources ?? [];
      const newResource = JSON.stringify({
        fileId: file.$id,
        fileName,
        mimeType,
        transcription: transcription ?? null,
        uploadedAt: new Date().toISOString(),
      });
      await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION, taskId, {
        resources: [...existing, newResource],
      });
    }

    return c.json({
      success: true,
      fileId: file.$id,
      fileName,
      attachedToTask: taskId ?? null,
    });
  },
);

export default app;
```

### 4b. Register the router

In your existing **`src/app/api/[[...route]]/route.ts`**, add:

```typescript
// At the top, add import:
import openclawApp from "@/features/openclaw/server/route";

// In the Hono app setup, add this route (alongside existing routes):
app.route("/oc", openclawApp);
```

---

## 5. Telegram Webhook Handler

This is **Mode 1** — zero install for regular users.

### 5a. Webhook handler

**File: `src/app/api/telegram/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { DATABASE_ID, WORKSPACE_INTEGRATIONS_ID } from "@/config";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The system prompt for task parsing
const PARSE_SYSTEM = `You parse natural language messages into task management actions.
Return ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "action": "create" | "complete" | "list" | "status" | "unknown",
  "title": "string (for create)",
  "description": "string (optional, for create)",
  "dueDate": "ISO 8601 string (optional, parse relative dates like 'tomorrow', 'friday 3pm', 'next week')",
  "priority": "low" | "medium" | "high",
  "taskRef": "string (partial task name, for complete/status actions)",
  "statusTo": "todo" | "in_progress" | "done" (for status action)
}

Priority detection:
- "urgent", "asap", "critical", "important", "!!" → high
- "whenever", "low priority", "eventually", "someday" → low  
- anything else → medium

Today's date for relative date parsing: ${new Date().toISOString()}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text: string = message.text ?? "";
    const voice = message.voice;
    const document = message.document;
    const photo = message.photo;

    // Find workspace integration by chatId
    const { databases } = await createAdminClient();
    const integResult = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACE_INTEGRATIONS_ID,
      [Query.equal("telegramChatId", chatId)],
    );

    if (!integResult.total) {
      // Unknown chat — send setup instructions
      await sendTelegramMessage(
        chatId,
        "BOT_TOKEN_PLACEHOLDER", // We'll handle this below
        "This bot isn't connected to a ManageMe workspace yet. Please set it up at manageme.vercel.app/settings.",
      );
      return NextResponse.json({ ok: true });
    }

    const integration = integResult.documents[0];
    const workspaceId: string = integration.workspaceId;
    const botToken: string = integration.telegramBotToken;

    // ── Handle voice note ──────────────────────────────────────────
    let inputText = text;
    if (voice) {
      inputText = await transcribeTelegramVoice(voice.file_id, botToken);
      if (!inputText) {
        await sendTelegramMessage(
          chatId,
          botToken,
          "Sorry, couldn't transcribe that voice note.",
        );
        return NextResponse.json({ ok: true });
      }
    }

    // ── Handle file/document/photo ─────────────────────────────────
    if (document || photo) {
      const file = document ?? photo[photo.length - 1]; // largest photo
      const fileInfo = await getTelegramFile(file.file_id, botToken);
      const caption = message.caption ?? "";

      // Download file from Telegram
      const fileBuffer = await downloadTelegramFile(
        fileInfo.file_path,
        botToken,
      );
      const base64Data = fileBuffer.toString("base64");
      const mimeType = document?.mime_type ?? "image/jpeg";
      const fileName = document?.file_name ?? `photo_${Date.now()}.jpg`;

      // Store in Appwrite and reply
      const { storage } = await createAdminClient();
      const stored = await storage.createFile(
        process.env.NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID!,
        ID.unique(),
        new File([fileBuffer], fileName, { type: mimeType }),
      );

      await sendTelegramMessage(
        chatId,
        botToken,
        `📎 File received: *${fileName}*\n${caption ? `Caption: ${caption}\n` : ""}File ID: \`${stored.$id}\`\n\nReply with a task name to attach this file to a task.`,
      );
      return NextResponse.json({ ok: true });
    }

    if (!inputText.trim()) return NextResponse.json({ ok: true });

    // ── Parse intent with Claude Haiku ─────────────────────────────
    const parseResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: PARSE_SYSTEM,
      messages: [{ role: "user", content: inputText }],
    });

    let parsed: any;
    try {
      parsed = JSON.parse(
        parseResponse.content[0].type === "text"
          ? parseResponse.content[0].text
          : "{}",
      );
    } catch {
      await sendTelegramMessage(
        chatId,
        botToken,
        "I didn't understand that. Try: 'Add task: [name]' or 'Show my tasks'.",
      );
      return NextResponse.json({ ok: true });
    }

    const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;

    // ── Handle each action ─────────────────────────────────────────
    if (parsed.action === "create") {
      const task = await databases.createDocument(
        DATABASE_ID,
        TASKS_COLLECTION,
        ID.unique(),
        {
          workspaceId,
          title: parsed.title,
          description: parsed.description ?? "",
          dueDate: parsed.dueDate ?? null,
          priority: parsed.priority ?? "medium",
          status: "todo",
          createdVia: "telegram",
          resources: [],
        },
      );

      const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" }[
        parsed.priority ?? "medium"
      ];
      const dueLine = parsed.dueDate
        ? `\n📅 Due: ${new Date(parsed.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : "";

      await sendTelegramMessage(
        chatId,
        botToken,
        `✅ Task created!\n\n${priorityEmoji} *${task.title}*${dueLine}\n\n_View on ManageMe →_ manageme.vercel.app`,
      );
    } else if (parsed.action === "list") {
      const result = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION,
        [
          Query.equal("workspaceId", workspaceId),
          Query.equal("status", "todo"),
          Query.orderAsc("dueDate"),
          Query.limit(10),
        ],
      );

      if (!result.total) {
        await sendTelegramMessage(
          chatId,
          botToken,
          "🎉 No pending tasks! You're all caught up.",
        );
      } else {
        const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
        const lines = result.documents.map((t, i) => {
          const p = (priorityEmoji as any)[t.priority ?? "medium"];
          const due = t.dueDate
            ? ` — ${new Date(t.dueDate).toLocaleDateString()}`
            : "";
          return `${i + 1}. ${p} ${t.title}${due}`;
        });
        await sendTelegramMessage(
          chatId,
          botToken,
          `📋 *Your tasks (${result.total} pending):*\n\n${lines.join("\n")}`,
        );
      }
    } else if (parsed.action === "complete" && parsed.taskRef) {
      // Fuzzy match by title
      const result = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION,
        [
          Query.equal("workspaceId", workspaceId),
          Query.equal("status", "todo"),
          Query.search("title", parsed.taskRef),
          Query.limit(1),
        ],
      );

      if (!result.total) {
        await sendTelegramMessage(
          chatId,
          botToken,
          `Couldn't find a task matching "${parsed.taskRef}". Try 'show tasks' first.`,
        );
      } else {
        const task = result.documents[0];
        await databases.updateDocument(
          DATABASE_ID,
          TASKS_COLLECTION,
          task.$id,
          {
            status: "done",
            completedAt: new Date().toISOString(),
          },
        );
        await sendTelegramMessage(
          chatId,
          botToken,
          `✅ Marked done: *${task.title}*`,
        );
      }
    } else {
      await sendTelegramMessage(
        chatId,
        botToken,
        `I can help you:\n• *Add a task* — "Add task: fix login bug by Friday"\n• *See your tasks* — "Show my tasks"\n• *Complete a task* — "Done with: fix login bug"\n• *Send a voice note* — I'll transcribe and create a task`,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// ─── Helper functions ─────────────────────────────────────────────

async function sendTelegramMessage(
  chatId: string,
  botToken: string,
  text: string,
) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function transcribeTelegramVoice(
  fileId: string,
  botToken: string,
): Promise<string> {
  try {
    const fileInfo = await getTelegramFile(fileId, botToken);
    const audioBuffer = await downloadTelegramFile(
      fileInfo.file_path,
      botToken,
    );

    // Use OpenAI Whisper or Deepgram — here using a simple approach via Claude
    // For production, use Deepgram or OpenAI Whisper API
    // This is a stub — replace with actual transcription service
    return ""; // Return empty string if no transcription service configured
  } catch {
    return "";
  }
}

async function getTelegramFile(fileId: string, botToken: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
  );
  const data = await res.json();
  return data.result;
}

async function downloadTelegramFile(
  filePath: string,
  botToken: string,
): Promise<Buffer> {
  const res = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`,
  );
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

### 5b. Webhook registration API

**File: `src/app/api/telegram/register/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite";
import { Query, ID } from "node-appwrite";
import { DATABASE_ID, WORKSPACE_INTEGRATIONS_ID } from "@/config";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { botToken, workspaceId } = await req.json();

  if (!botToken || !workspaceId) {
    return NextResponse.json(
      { error: "botToken and workspaceId required" },
      { status: 400 },
    );
  }

  // Verify the bot token is valid with Telegram
  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const meData = await meRes.json();
  if (!meData.ok) {
    return NextResponse.json({ error: "Invalid bot token" }, { status: 400 });
  }

  // Register webhook with Telegram
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
  const whRes = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
    },
  );
  const whData = await whRes.json();
  if (!whData.ok) {
    return NextResponse.json(
      { error: "Failed to set webhook" },
      { status: 500 },
    );
  }

  // Generate OpenClaw secret for this workspace
  const openclawSecret = crypto.randomUUID();

  // Upsert integration record in Appwrite
  const { databases } = await createSessionClient();
  const existing = await databases.listDocuments(
    DATABASE_ID,
    WORKSPACE_INTEGRATIONS_ID,
    [Query.equal("workspaceId", workspaceId)],
  );

  if (existing.total) {
    await databases.updateDocument(
      DATABASE_ID,
      WORKSPACE_INTEGRATIONS_ID,
      existing.documents[0].$id,
      { telegramBotToken: botToken, openclawSecret, platforms: ["telegram"] },
    );
  } else {
    await databases.createDocument(
      DATABASE_ID,
      WORKSPACE_INTEGRATIONS_ID,
      ID.unique(),
      {
        workspaceId,
        telegramBotToken: botToken,
        openclawSecret,
        platforms: ["telegram"],
      },
    );
  }

  return NextResponse.json({
    success: true,
    botName: meData.result.username,
    openclawSecret,
  });
}
```

---

## 6. OpenClaw Skill File

**File: `manageme.skill.md`** (place in repo root; users download this alongside their config)

```markdown
# ManageMe Task Manager Skill

You are the AI assistant for ManageMe, a team productivity platform.
Your job is to manage tasks on behalf of the user across their workspaces.

---

## Configuration

- Base URL: read from env `MANAGEME_API_URL` (default: https://manageme.vercel.app)
- Auth header: `x-openclaw-secret: <MANAGEME_OPENCLAW_SECRET>`
- Workspace: `x-workspace-id: <MANAGEME_WORKSPACE_ID>` (also append as ?w= query param)

All requests must include both the secret header and workspace ID.

---

## Available Actions

### 1. Create a task

**Trigger phrases:** "add task", "create task", "remind me to", "todo", "don't forget",
"schedule", "note this", "I need to", "make a task"

**API call:**
```

POST {MANAGEME_API_URL}/api/oc/task?w={MANAGEME_WORKSPACE_ID}
Header: x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
Body: {
"title": "string",
"description": "string (optional)",
"dueDate": "ISO 8601 string (optional)",
"priority": "low|medium|high",
"sourceChannel": "telegram|whatsapp|slack|discord"
}

```

**Due date parsing** — convert these to ISO 8601:
- "tomorrow" → next calendar day at 09:00
- "friday" / "next friday" → upcoming Friday at 09:00
- "friday 3pm" → upcoming Friday at 15:00
- "in 2 hours" → current time + 2 hours
- "end of day" / "eod" → today at 18:00
- "next week" → next Monday at 09:00

**Priority parsing:**
- "urgent", "asap", "critical", "important", "!!" → "high"
- "whenever", "low priority", "eventually", "someday", "no rush" → "low"
- everything else → "medium"

**Reply format:**
```

✅ Task created!
🔴/🟡/🟢 {title}
📅 Due: {formatted date} (if set)

```

---

### 2. List tasks

**Trigger phrases:** "show my tasks", "what's pending", "my todos", "what do I have",
"list tasks", "what's due today", "show everything"

**API call:**
```

GET {MANAGEME_API_URL}/api/oc/tasks?w={MANAGEME_WORKSPACE_ID}&status=todo

```

**Reply format:**
```

📋 Your tasks (N pending):

1. 🔴 Fix login bug — due Fri
2. 🟡 Write blog post — due Mon
3. 🟢 Read that article

```
If no tasks: "🎉 You're all caught up! No pending tasks."

---

### 3. Complete a task

**Trigger phrases:** "done with", "completed", "mark done", "finished", "tick off",
"I finished", "close task"

**API call:**
```

GET {MANAGEME_API_URL}/api/oc/tasks?w={MANAGEME_WORKSPACE_ID}&status=todo

```
Match the task title from the user's message using fuzzy matching (e.g. "fix login" matches "Fix login bug").
Then:
```

PATCH {MANAGEME_API_URL}/api/oc/task/{taskId}/complete?w={MANAGEME_WORKSPACE_ID}

```

**Reply format:**
```

✅ Marked done: {task title}

```

---

### 4. Handle a voice note

When the user sends a voice note (OpenClaw auto-transcribes it):
1. Read the transcript.
2. Extract the task intent: title, due date, priority.
3. Call POST /api/oc/task with what you extracted.
4. Reply: "🎙️ Got it from your voice note — created task: *{title}*"

If the transcript is unclear, ask: "I heard: '{transcript}' — should I create a task from this?"

---

### 5. Handle a file (PDF, image, document)

When the user sends a file:
1. Read the file path from OpenClaw's media handling.
2. Convert to base64.
3. Call POST /api/oc/resource:
```

POST {MANAGEME_API_URL}/api/oc/resource?w={MANAGEME_WORKSPACE_ID}
Body: {
"fileName": "...",
"mimeType": "...",
"base64Data": "...",
"taskId": "..." (optional — ask user if they want to attach it to a task),
"transcription": "..." (for voice notes, include the transcript)
}

```
4. Reply: "📎 File saved to ManageMe: {fileName}"
   Then ask: "Should I attach this to a task? Reply with the task name or 'no'."

---

## Cron Behaviors

OpenClaw should run these cron tasks automatically:

### Morning briefing (8:00 AM daily)
```

GET /api/oc/tasks?w={MANAGEME_WORKSPACE_ID}&status=todo

```
Send a morning summary message to the user.
Format:
```

☀️ Good morning! Here's your ManageMe briefing:

🔴 HIGH PRIORITY (N):
• Task name — due today

📋 TODAY'S TASKS (N):
• Task — due 2pm

📅 UPCOMING:
• Task — due Friday

Reply with task names to update them, or just chat!

```

### Due-soon reminders (every hour)
```

GET /api/oc/tasks?w={MANAGEME_WORKSPACE_ID}&status=todo&dueWithin=1h

```
If any tasks are returned:
```

⏰ Heads up! These tasks are due within the hour:
• {task title} — due {time}

```

### Evening wrap-up (6:00 PM daily)
```

GET /api/oc/tasks?w={MANAGEME_WORKSPACE_ID}&status=done

```
Count tasks completed today (filter by completedAt date).
Send:
```

🌙 End of day wrap-up:
✅ Completed today: N tasks
📋 Still pending: N tasks

```

---

## Error handling

- If an API call fails with 401: tell the user "Your ManageMe connection needs re-authorizing. Please check your settings."
- If an API call fails with 404: tell the user "That workspace wasn't found. Please check your OpenClaw config."
- If any other error: tell the user "Something went wrong reaching ManageMe. Try again in a moment."
- Never show raw error messages or stack traces to the user.

---

## Personality

- Be brief and action-oriented. Confirm actions in 1-2 lines.
- Use emoji sparingly but consistently (✅ for done, 📋 for lists, ⏰ for reminders).
- If the user is unclear, make a reasonable assumption and state it: "I'm creating this as medium priority — say 'urgent' to change it."
- For lists longer than 10 items, show the top 10 and say "...and N more. Say 'show all' for the full list."
```

---

## 7. OpenClaw Config Template

**File: `openclaw-config.template.json`** (placed in repo root; users fill in their values OR download pre-filled from ManageMe settings)

```json
{
  "gateway": {
    "port": 18789,
    "model": "claude-sonnet-4-6"
  },
  "providers": {
    "anthropic": {
      "apiKey": "REPLACE_WITH_YOUR_ANTHROPIC_KEY"
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "REPLACE_WITH_YOUR_TELEGRAM_BOT_TOKEN"
    }
  },
  "skills": [
    {
      "path": "./manageme.skill.md",
      "name": "manageme",
      "env": {
        "MANAGEME_API_URL": "https://manageme.vercel.app",
        "MANAGEME_OPENCLAW_SECRET": "REPLACE_WITH_SECRET_FROM_MANAGEME_SETTINGS",
        "MANAGEME_WORKSPACE_ID": "REPLACE_WITH_YOUR_WORKSPACE_ID"
      }
    }
  ],
  "tools": {
    "webSearch": {
      "enabled": true,
      "provider": "brave"
    }
  },
  "cron": [
    {
      "schedule": "0 8 * * *",
      "message": "Run the morning briefing cron task from the manageme skill."
    },
    {
      "schedule": "0 * * * *",
      "message": "Run the due-soon reminder check from the manageme skill."
    },
    {
      "schedule": "0 18 * * *",
      "message": "Run the evening wrap-up cron task from the manageme skill."
    }
  ]
}
```

---

## 8. Platform Onboarding UI

### 8a. Settings page route

**File: `src/app/(standalone)/workspaces/[workspaceId]/settings/connect/page.tsx`**

This page should:

1. Show platform cards (Telegram, WhatsApp, Slack, Discord) with difficulty badges
2. Let the user enter credentials per platform
3. On "Connect Telegram" — call `/api/telegram/register` → show success/error
4. On "Download OpenClaw Config" — generate and download the pre-filled JSON
5. Show a "Connection Status" chip that polls `/api/oc/ping` every 30 seconds

```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PLATFORMS = [
  {
    id: "telegram",
    name: "Telegram",
    difficulty: "Easy",
    difficultyColor: "bg-green-100 text-green-800",
    description:
      "Get a bot token from @BotFather in 2 minutes. Supports voice notes, files, and text.",
    steps: [
      "Open Telegram → search @BotFather",
      "Send /newbot and follow prompts",
      "Copy the API token and paste below",
    ],
    credLabel: "Bot Token",
    credPlaceholder: "1234567890:ABCdefGHIjklMNOpqrSTUVwxyz",
  },
  {
    id: "slack",
    name: "Slack",
    difficulty: "Medium",
    difficultyColor: "bg-yellow-100 text-yellow-800",
    description:
      "Create a Slack app and add it to your workspace. Supports text commands.",
    steps: [
      "Create app at api.slack.com/apps",
      "Add bot token scopes: chat:write, im:history",
      "Install app to workspace",
    ],
    credLabel: "Bot OAuth Token",
    credPlaceholder: "xoxb-...",
  },
  {
    id: "discord",
    name: "Discord",
    difficulty: "Easy",
    difficultyColor: "bg-green-100 text-green-800",
    description: "Create a Discord bot and invite it to your server.",
    steps: [
      "Create app at discord.com/developers",
      "Create a bot and copy the token",
      "Invite bot to your server",
    ],
    credLabel: "Bot Token",
    credPlaceholder: "MTIzNDU2...",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    difficulty: "Hard",
    difficultyColor: "bg-red-100 text-red-800",
    description:
      "Requires WhatsApp Business API via Meta or Twilio. Best for teams.",
    steps: [
      "Sign up for WhatsApp Business API",
      "Use OpenClaw locally with the WhatsApp channel plugin",
    ],
    credLabel: "Phone Number ID",
    credPlaceholder: "Requires OpenClaw local setup",
  },
];

export default function ConnectPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [openclawSecret, setOpenclawSecret] = useState<string>("");
  const [openclawStatus, setOpenclawStatus] = useState<
    "unknown" | "connected" | "disconnected"
  >("unknown");

  async function connectTelegram() {
    const token = credentials["telegram"];
    if (!token) return toast.error("Please enter your bot token first.");

    setLoading((p) => ({ ...p, telegram: true }));
    try {
      const res = await fetch("/api/telegram/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: token, workspaceId }),
      });
      const data = await res.json();

      if (data.success) {
        setConnected((p) => ({ ...p, telegram: true }));
        setOpenclawSecret(data.openclawSecret);
        toast.success(`Connected! Bot @${data.botName} is ready.`);
      } else {
        toast.error(data.error ?? "Connection failed.");
      }
    } finally {
      setLoading((p) => ({ ...p, telegram: false }));
    }
  }

  function downloadOpenClawConfig() {
    const config = {
      gateway: { port: 18789, model: "claude-sonnet-4-6" },
      providers: { anthropic: { apiKey: "REPLACE_WITH_YOUR_ANTHROPIC_KEY" } },
      channels: {
        ...(connected["telegram"]
          ? { telegram: { enabled: true, botToken: credentials["telegram"] } }
          : {}),
        ...(connected["discord"]
          ? { discord: { enabled: true, botToken: credentials["discord"] } }
          : {}),
      },
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
    const a = document.createElement("a");
    a.href = url;
    a.download = "openclaw-config.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      "Config downloaded! Place it in ~/.openclaw/ and run: openclaw start",
    );
  }

  async function checkOpenClawStatus() {
    if (!openclawSecret) return;
    try {
      const res = await fetch(
        `${window.location.origin}/api/oc/ping?w=${workspaceId}`,
        { headers: { "x-openclaw-secret": openclawSecret } },
      );
      setOpenclawStatus(res.ok ? "connected" : "disconnected");
    } catch {
      setOpenclawStatus("disconnected");
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Connect Platforms</h1>
        <p className="text-muted-foreground mt-1">
          Manage tasks from WhatsApp, Telegram, Slack, and more — without
          opening ManageMe.
        </p>
      </div>

      <div className="space-y-4">
        {PLATFORMS.map((platform) => (
          <Card key={platform.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{platform.name}</CardTitle>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${platform.difficultyColor}`}
                >
                  {platform.difficulty}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {platform.description}
              </p>
            </CardHeader>
            <CardContent>
              <ol className="text-sm text-muted-foreground space-y-1 mb-4">
                {platform.steps.map((step, i) => (
                  <li key={i}>
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <Input
                  placeholder={platform.credPlaceholder}
                  value={credentials[platform.id] ?? ""}
                  onChange={(e) =>
                    setCredentials((p) => ({
                      ...p,
                      [platform.id]: e.target.value,
                    }))
                  }
                  disabled={
                    connected[platform.id] || platform.id === "whatsapp"
                  }
                  className="flex-1 font-mono text-sm"
                />
                {platform.id === "telegram" && (
                  <Button
                    onClick={connectTelegram}
                    disabled={loading["telegram"] || connected["telegram"]}
                    variant={connected["telegram"] ? "outline" : "default"}
                    size="sm"
                  >
                    {loading["telegram"]
                      ? "Connecting..."
                      : connected["telegram"]
                        ? "✓ Connected"
                        : "Connect"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* OpenClaw Power Mode section */}
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
                  Not running
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Run OpenClaw locally to use WhatsApp, Signal, all platforms at once,
            voice notes, and cron reminders.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted rounded-md p-3 font-mono text-sm space-y-1">
            <p>1. curl -fsSL https://openclaw.ai/install.sh | bash</p>
            <p>2. Download your config below</p>
            <p>3. cp openclaw-config.json ~/.openclaw/config.json</p>
            <p>4. cp manageme.skill.md ~/</p>
            <p>5. openclaw start</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={downloadOpenClawConfig}
              variant="outline"
              className="flex-1"
            >
              Download openclaw-config.json
            </Button>
            <Button onClick={checkOpenClawStatus} variant="ghost" size="sm">
              Check status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8b. Add link to existing settings sidebar

In whatever sidebar/nav component handles workspace settings (likely in `src/components/` or inside the standalone layout), add a link:

```tsx
// Add to settings navigation items:
{ href: `/workspaces/${workspaceId}/settings/connect`, label: "Connect Platforms", icon: <MessageSquare /> }
```

---

## 9. Task Card Updates

### 9a. Add "source channel" badge to task cards

Find the existing task card component (likely in `src/features/tasks/components/`). Add a small badge showing where the task was created:

```tsx
// In the task card, after the title:
{
  task.createdVia && task.createdVia !== "web" && (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
      {task.createdVia === "telegram" && "🤖 Telegram"}
      {task.createdVia === "whatsapp" && "📱 WhatsApp"}
      {task.createdVia === "slack" && "💬 Slack"}
      {task.createdVia === "discord" && "🎮 Discord"}
      {task.createdVia === "openclaw" && "🦞 OpenClaw"}
    </span>
  );
}
```

### 9b. Add priority badge

```tsx
// Priority indicator (add to task card):
{
  task.priority && (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded-full font-medium",
        task.priority === "high" && "bg-red-100 text-red-700",
        task.priority === "medium" && "bg-yellow-100 text-yellow-700",
        task.priority === "low" && "bg-green-100 text-green-700",
      )}
    >
      {task.priority}
    </span>
  );
}
```

### 9c. Add due date display

```tsx
// Due date (add to task card):
{
  task.dueDate && (
    <span
      className={cn(
        "text-xs text-muted-foreground",
        new Date(task.dueDate) < new Date() && "text-red-500 font-medium",
      )}
    >
      📅{" "}
      {new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}
    </span>
  );
}
```

### 9d. Add resources indicator

```tsx
// Resources badge (add to task card):
{
  task.resources?.length > 0 && (
    <span className="text-xs text-muted-foreground">
      📎 {task.resources.length} file{task.resources.length > 1 ? "s" : ""}
    </span>
  );
}
```

---

## 10. Cron Reminder Endpoint

For Mode 1 (Vercel-hosted), add a cron endpoint that sends Telegram reminders automatically.

**File: `src/app/api/cron/reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { Query } from "node-appwrite";
import { DATABASE_ID, WORKSPACE_INTEGRATIONS_ID } from "@/config";

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { databases } = await createAdminClient();
  const TASKS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_TASKS_ID!;

  // Get all workspaces with Telegram connected
  const integrations = await databases.listDocuments(
    DATABASE_ID,
    WORKSPACE_INTEGRATIONS_ID,
    [Query.isNotNull("telegramChatId"), Query.limit(100)],
  );

  for (const integration of integrations.documents) {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const tasks = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION, [
      Query.equal("workspaceId", integration.workspaceId),
      Query.equal("status", "todo"),
      Query.lessThanEqual("dueDate", soon),
      Query.greaterThan("dueDate", new Date().toISOString()),
    ]);

    if (tasks.total > 0) {
      const lines = tasks.documents
        .map(
          (t) =>
            `• ${t.title} — due ${new Date(t.dueDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
        )
        .join("\n");

      await fetch(
        `https://api.telegram.org/bot${integration.telegramBotToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: integration.telegramChatId,
            text: `⏰ *Due within the hour:*\n\n${lines}`,
            parse_mode: "Markdown",
          }),
        },
      );
    }
  }

  return NextResponse.json({ ok: true, processed: integrations.total });
}
```

Add to **`vercel.json`** (create if it doesn't exist):

```json
{
  "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }]
}
```

---

## 11. File Structure Summary

All new files to create (do not delete existing files):

```
manageme/
├── manageme.skill.md                          ← NEW: OpenClaw skill (repo root)
├── openclaw-config.template.json             ← NEW: Config template (repo root)
├── vercel.json                               ← NEW or MODIFY: Add cron
├── src/
│   ├── config.ts                             ← MODIFY: Add WORKSPACE_INTEGRATIONS_ID, FILES_BUCKET_ID
│   ├── app/
│   │   ├── api/
│   │   │   ├── [[...route]]/route.ts         ← MODIFY: Add app.route("/oc", openclawApp)
│   │   │   ├── telegram/
│   │   │   │   ├── webhook/route.ts          ← NEW
│   │   │   │   └── register/route.ts         ← NEW
│   │   │   └── cron/
│   │   │       └── reminders/route.ts        ← NEW
│   │   └── (standalone)/
│   │       └── workspaces/[workspaceId]/
│   │           └── settings/
│   │               └── connect/
│   │                   └── page.tsx          ← NEW
│   └── features/
│       ├── openclaw/
│       │   └── server/
│       │       └── route.ts                  ← NEW
│       └── tasks/
│           └── components/
│               └── task-card.tsx             ← MODIFY: Add badges for priority, due date, source, resources
```

---

## 12. Integration Checklist

Complete these in order:

**Appwrite (do first — everything depends on this):**

- [ ] Add `status`, `priority`, `dueDate`, `completedAt`, `createdVia`, `resources`, `assigneeId`, `description` to tasks collection
- [ ] Create `workspace_integrations` collection with all attributes listed in Section 2
- [ ] Create files bucket in Appwrite Storage
- [ ] Copy new collection/bucket IDs to `.env.local`

**Environment variables:**

- [ ] Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel
- [ ] Add `OPENCLAW_MASTER_SECRET`, `CRON_SECRET` to both
- [ ] Add `NEXT_PUBLIC_APP_URL=https://manageme.vercel.app` to Vercel

**Code:**

- [ ] Create `src/features/openclaw/server/route.ts`
- [ ] Register `/oc` route in existing Hono router
- [ ] Create `src/app/api/telegram/webhook/route.ts`
- [ ] Create `src/app/api/telegram/register/route.ts`
- [ ] Create `src/app/api/cron/reminders/route.ts`
- [ ] Create `src/app/(standalone)/workspaces/[workspaceId]/settings/connect/page.tsx`
- [ ] Update task card component with priority/due/source/resources badges
- [ ] Update `src/config.ts`
- [ ] Create `vercel.json` with cron config

**Files for OpenClaw users:**

- [ ] Create `manageme.skill.md` at repo root
- [ ] Create `openclaw-config.template.json` at repo root

**Test:**

- [ ] Test `/api/oc/ping` with correct secret returns 200
- [ ] Test POST `/api/oc/task` creates a task visible in dashboard
- [ ] Create a Telegram bot via @BotFather, paste token in /settings/connect, verify webhook registers
- [ ] Send "Add task: test task" to the Telegram bot, verify task appears in ManageMe
- [ ] Install OpenClaw locally, point at skill file and config, send a voice note via Telegram, verify task is created

---

## Notes for the AI implementing this

1. **Do not change existing workspace/project/member logic.** Only add new routes and new UI pages.

2. **The `createAdminClient` function** already exists in `src/lib/appwrite.ts`. Use it for all OpenClaw/webhook routes since they don't have a user session.

3. **Tasks collection ID** — look for the existing constant in `src/config.ts`. It might be `TASKS_ID` or `NEXT_PUBLIC_APPWRITE_TASKS_ID`. Use whatever already exists; do not rename it.

4. **The Hono app** in `src/app/api/[[...route]]/route.ts` already has a pattern for route registration. Follow that exact pattern when adding `app.route("/oc", openclawApp)`.

5. **Tailwind classes** — use only Tailwind v3 utilities that match what's already used in the project. Don't introduce new dependencies.

6. **Error handling** — all API routes should return `{ ok: true }` (200) on Telegram webhook errors to prevent Telegram from retrying. Internal errors should be logged to console.

7. **The `resources` field** stores JSON strings (not objects) because Appwrite string arrays can't store nested objects directly. Parse them on the frontend with `JSON.parse(resource)`.

8. **Voice transcription** in the Telegram webhook is left as a stub. For the demo, either skip it and show only the text pipeline, or integrate Deepgram (free tier at deepgram.com) using their Node SDK: `@deepgram/sdk`.
