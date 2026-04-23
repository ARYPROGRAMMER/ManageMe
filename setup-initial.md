# ManageMe OpenClaw Setup (Discord first, then Telegram)

This setup follows your requested order:

1. Discord integration and testing first
2. Telegram integration and testing second

---

## 1. Required environment variables

Set these in `.env.local` (for ManageMe app) and in your shell/OpenClaw runtime environment (for OpenClaw):

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=...
NEXT_PUBLIC_APPWRITE_PROJECT=...
NEXT_APPWRITE_KEY=...

NEXT_PUBLIC_APPWRITE_DATABASE_ID=...
NEXT_PUBLIC_APPWRITE_WORKSPACES_ID=...
NEXT_PUBLIC_APPWRITE_MEMBERS_ID=...
NEXT_PUBLIC_APPWRITE_PROJECTS_ID=...
NEXT_PUBLIC_APPWRITE_TASKS_ID=...
NEXT_PUBLIC_APPWRITE_INTEGRATIONS_ID=...
NEXT_PUBLIC_APPWRITE_IMAGES_BUCKET_ID=...
NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID=...

NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENCLAW_MASTER_SECRET=generate-a-long-random-string
GEMINI_API_KEY=your-provider-api-key
```

### Why a provider API key env var is referenced in `openclaw.json`

OpenClaw needs provider credentials to call your selected model.
If you use Gemini, keep:

```json
"apiKey": "${GEMINI_API_KEY}"
```

For other providers, use their env var name in the config generator (for example `OPENAI_API_KEY`).
In all cases, the key is read from environment at runtime (safer), not hardcoded into config.

---

##  ~/.openclaw/openclaw.json` (SAFE TEMPLATE)

```json
{
  "agents": {
    "defaults": {
      "workspace": "/home/your-user/.openclaw/workspace",
      "model": {
        "primary": "google/gemini-3.1-flash-lite"
      },
      "skills": ["manageme"],
      "models": {
        "google/gemini-3.1-pro-preview": {},
        "google/gemini-3-flash-preview": {}
      }
    }
  },
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "REPLACE_WITH_RANDOM_TOKEN"
    },
    "port": 18789,
    "bind": "loopback",
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    }
  },
  "session": {
    "dmScope": "per-channel-peer"
  },
  "tools": {
    "profile": "coding"
  },
  "auth": {
    "profiles": {
      "google:default": {
        "provider": "google",
        "mode": "api_key"
      }
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": {
        "source": "env",
        "provider": "default",
        "id": "DISCORD_BOT_TOKEN"
      }
    }
  },
  "skills": {
    "entries": {
      "manageme": {
        "env": {
          "MANAGEME_API_URL": "http://YOUR_HOST:3000",
          "MANAGEME_WORKSPACE_ID": "YOUR_WORKSPACE_ID"
        }
      }
    }
  }
}
```

---

## Environment variables (REQUIRED)

```bash
export MANAGEME_OPENCLAW_SECRET="YOUR_SECRET"
export DISCORD_BOT_TOKEN="YOUR_DISCORD_TOKEN"
```

Make permanent:

```bash
echo 'export MANAGEME_OPENCLAW_SECRET="YOUR_SECRET"' >> ~/.bashrc
echo 'export DISCORD_BOT_TOKEN="YOUR_DISCORD_TOKEN"' >> ~/.bashrc
source ~/.bashrc
```

---

## Skill location

```bash
~/.openclaw/skills/manageme/SKILL.md
```

# ManageMe + OpenClaw

## Setup
1. Place skill:
   ~/.openclaw/skills/manageme/SKILL.md

2. Set env vars:
   export MANAGEME_OPENCLAW_SECRET=...
   export DISCORD_BOT_TOKEN=...

3. Update config:
   ~/.openclaw/openclaw.json

4. Start:
   openclaw gateway run

## Notes
- Ensure agent has: "skills": ["manageme"]

---

## 2. Appwrite setup

### Tasks table attributes (add if missing)

- `status` (enum; includes existing workflow values)
- `priority` (string/enum; `low|medium|high`)
- `dueDate` (datetime)
- `completedAt` (datetime, optional)
- `createdVia` (string, optional; `web|telegram|discord|slack|whatsapp|openclaw`)
- `resources` (string array; JSON-encoded entries)
- `assigneeId` (string)
- `description` (string, up to 5000)

### New workspace integrations table

Create table/collection mapped to `NEXT_PUBLIC_APPWRITE_INTEGRATIONS_ID` with:

- `workspaceId` (string, required)
- `telegramBotToken` (string, optional)
- `telegramChatId` (string, optional)
- `slackWebhookUrl` (string, optional)
- `discordWebhookUrl` (string, optional; used to store Discord credential)
- `openclawSecret` (string, optional)
- `openclawEnabled` (boolean, optional)
- `platforms` (string array, optional)

### File bucket

Create the files bucket mapped to `NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID`.

---

## 3. OpenClaw files in this repo

- `manageme.skill.md` (primary)
- `openclaw-config.template.json`
- `/workspaces/{workspaceId}/settings/connect` page for credential save + config download

---

## 4. Install and run OpenClaw

1. Install OpenClaw (use your official installer method).
2. Copy `openclaw-config.template.json` to `~/.openclaw/openclaw.json`.
3. Replace placeholders:
   - `MANAGEME_WORKSPACE_ID` (your ManageMe workspace id)
   - `MANAGEME_OPENCLAW_SECRET` (from ManageMe Connect Platforms page)
   - channel bot tokens (Discord/Telegram/etc)
4. Keep `manageme.skill.md` next to config and update path if needed.
5. Start OpenClaw.

Recommended Gemini setup commands:

```bash
openclaw onboard --auth-choice gemini-api-key
openclaw models set google/gemini-3-flash-preview
```

Optional shell env example before start:

```bash
export GEMINI_API_KEY="your-real-key"
openclaw start
```

---

## 5. Discord setup + test (first)

1. Create Discord bot token in Discord Developer Portal.
2. Open ManageMe:
   - `Workspace -> Settings -> Connect Platforms`
3. Paste Discord token and click **Connect**.
4. Download generated `openclaw.json`.
5. Place config into `~/.openclaw/openclaw.json`.
6. Start OpenClaw and send Discord message:
   - `add task: test discord task due tomorrow`
7. Verify task appears in ManageMe dashboard with:
   - source badge `Discord`
   - priority/due info on task card

---

## 6. Telegram setup + test (second)

1. Create bot token via `@BotFather`.
2. In ManageMe Connect Platforms page, paste Telegram token and click **Connect**.
3. Re-download `openclaw.json` so it includes Telegram channel values.
4. Restart OpenClaw with updated config.
5. Send Telegram message:
   - `add task: test telegram task in progress`
6. Verify task appears in ManageMe with source badge `Telegram`.

---

## 7. API sanity checks

With correct workspace + secret:

- `GET /api/oc/ping?w=<workspaceId>`
- `GET /api/oc/projects?w=<workspaceId>`
- `POST /api/oc/project?w=<workspaceId>`
- `POST /api/oc/task?w=<workspaceId>`
- `GET /api/oc/tasks?w=<workspaceId>&status=todo`
- `PATCH /api/oc/task/{taskId}/complete?w=<workspaceId>`
- `PATCH /api/oc/task/{taskId}/status?w=<workspaceId>`
- `POST /api/oc/resource?w=<workspaceId>`

If any endpoint returns `401`, re-check `x-openclaw-secret`.

---

## 9. Fix "login wall" / unauthorized behavior

If OpenClaw says it cannot pass `/sign-in`, your skill/config is not pointing to ManageMe API auth vars correctly.

Required in `openclaw.json` skill env:

```json
"MANAGEME_API_URL": "http://localhost:3000",
"MANAGEME_OPENCLAW_SECRET": "your-secret",
"MANAGEME_WORKSPACE_ID": "your-workspace-id"
```

Also ensure the skill path is:

```json
"path": "./manageme.skill.md"
```

Then restart OpenClaw. It should call `/api/oc/*` endpoints directly and stop trying web login routes.

---

## 8. Attachment and instant-update behavior

- Attachments from chat apps are accepted through `/api/oc/resource` as base64 payloads (PDF/JPG/PNG/TXT/audio/docs).
- Task details page now renders attachment entries and opens files from Appwrite storage.
- Task list and task details use periodic refetch so OpenClaw-created updates appear quickly in UI.
