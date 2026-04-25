<p align="center">
	<img src="./readme-logo.svg" alt="ManageMe Logo" />
</p>

# ManageMe

I was fed up of going to a task management service and organise my day and goals, hence presenting ManageMe - A workspace and task management dashboard with OpenClaw integration for external channels.

## Quick Start

### Prerequisites

- Node.js 18+
- npm, pnpm, yarn, or bun
- Appwrite instance (self-hosted or cloud)

### Install

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```bash
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite.cloud
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id

NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_WORKSPACES_ID=workspaces-collection-id
NEXT_PUBLIC_APPWRITE_MEMBERS_ID=members-collection-id
NEXT_PUBLIC_APPWRITE_PROJECTS_ID=projects-collection-id
NEXT_PUBLIC_APPWRITE_TASKS_ID=tasks-collection-id
NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID=files-bucket-id
NEXT_PUBLIC_APPWRITE_IMAGES_BUCKET_ID=images-bucket-id
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## OpenClaw Setup

ManageMe includes built-in OpenClaw integration for connecting external channels (Discord, Telegram, Slack, etc.) to your workspace.

### 1. Install OpenClaw

Follow the [OpenClaw installation guide](https://github.com/OpenClaw/OpenClaw) to set up the gateway.

### 2. Configure OpenClaw

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "manageme": {
        "env": {
          "MANAGEME_API_URL": "http://localhost:3000",
          "MANAGEME_OPENCLAW_SECRET": "your-secret-here",
          "MANAGEME_WORKSPACE_ID": "your-workspace-id"
        }
      }
    }
  }
}
```

### 3. Install the Skill

```bash
cp manageme.skill.json ~/.openclaw/skills/manageme/SKILL.md
```

Or manually create `~/.openclaw/skills/manageme/SKILL.md` with the contents of `manageme.skill.md`.

### 4. Configure Channels

Example Discord channel setup in `openclaw.json`:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": {
        "source": "env",
        "provider": "default",
        "id": "DISCORD_BOT_TOKEN"
      },
      "skills": ["manageme"],
      "dm": {
        "enabled": true
      }
    }
  }
}
```

### 5. Set Environment Variables

```bash
export MANAGEME_API_URL="http://localhost:3000"
export MANAGEME_OPENCLAW_SECRET="your-secret-here"
export MANAGEME_WORKSPACE_ID="your-workspace-id"
export DISCORD_BOT_TOKEN="your-discord-token"
```

### 6. Start OpenClaw

```bash
openclaw start
```

## Usage

### From Discord/Telegram/Slack

Once connected, you can manage tasks from your channel:

```
/create task "Review PR" --due 2024-01-15 --priority high
/list tasks
/complete task 123
/upload resource <file> --task 123
```

See `manageme.skill.md` for all available commands.

## Features

- **Task Management**: Create, update, complete tasks
- **File Attachments**: Upload files to tasks (images, PDFs, documents)
- **Workspaces**: Organize tasks by workspace
- **Projects**: Group tasks into projects
- **Members**: Assign tasks to team members
- **OpenClaw Integration**: Manage tasks from external channels

## API Endpoints

### OpenClaw API (`/api/oc/*`)

For external channel integrations:

- `GET /api/oc/ping` - Health check
- `GET /api/oc/tasks` - List tasks
- `POST /api/oc/task` - Create task
- `PATCH /api/oc/task/{id}/status` - Update status
- `PATCH /api/oc/task/{id}/complete` - Complete task
- `POST /api/oc/resource` - Upload file attachment

### Web UI API (`/api/tasks/*`)

For the web interface:

- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/{id}/resource` - Upload attachment
- `DELETE /api/tasks/{id}/resource/{fileId}` - Delete attachment

## File Upload

### From Web UI

1. Navigate to a task
2. Click "Add File" or drag and drop
3. File appears in attachments list

### From OpenClaw

```bash
curl -X POST "http://localhost:3000/api/oc/resource?w=workspace-id" \
  -H "x-openclaw-secret: your-secret" \
  -F "file=@./document.pdf" \
  -F "taskId=task-id"
```

## Architecture

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Radix UI
- **State**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Backend**: Appwrite (DB, Auth, Storage)
- **API**: Hono (type-safe routes)

## Project Structure

```
src/
├── app/                    # Next.js routes
├── features/               # Feature modules
│   ├── tasks/             # Task management
│   ├── projects/          # Project management
│   ├── workspaces/        # Workspace management
│   └── openclaw/          # OpenClaw integration
├── components/            # Reusable UI
└── lib/                   # Utilities
```

## Scripts

```bash
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Lint code
```

## Documentation

- [OpenClaw Skills Guide](https://github.com/OpenClaw/OpenClaw/blob/main/docs/skills.md)
- [Appwrite Documentation](https://appwrite.io/docs)
- [Hono Framework](https://hono.dev)

## Architecture Deep Dive

### OpenClaw Integration Pattern

ManageMe demonstrates a clean separation between the web interface and external channel integrations:

```
External Channel (Discord/Telegram/Slack)
    ↓
OpenClaw Gateway (Authentication, Rate Limiting, Routing)
    ↓
ManageMe Skill (Command Parsing, Intent Recognition)
    ↓
Hono API (Type-Safe Endpoints)
    ↓
Zod Validation (Runtime Type Checking)
    ↓
Appwrite (Persistence, Real-time Subscriptions)
    ↓
Web Frontend (React Query Cache)
```

### Command Processing Pipeline

1. **Request Reception**: OpenClaw receives HTTP POST from channel adapter
2. **Security Validation**: HMAC signature verification, rate limit check
3. **Routing**: Skill router directs to ManageMe handler
4. **Parsing**: Natural language → structured command (action, entity, parameters)
5. **Validation**: Zod schemas ensure data integrity
6. **Execution**: Business logic creates/updates resources
7. **Response**: Formatted for specific channel (Discord embeds, Telegram markdown)
8. **Propagation**: React Query invalidation triggers real-time updates

### File Upload Architecture

```typescript
// Multi-format support
interface UploadHandler {
  // multipart/form-data (large files)
  handleMultipart(file: File, metadata: Metadata): Promise<UploadResult>;

  // application/json (base64 encoded)
  handleBase64(data: string, mimeType: string): Promise<UploadResult>;

  // application/octet-stream (raw binary)
  handleBinary(buffer: ArrayBuffer, filename: string): Promise<UploadResult>;

  // text/plain (simple text)
  handleText(content: string): Promise<UploadResult>;
}
```

**Key Insight**: The FormData bug (passing FormData directly to Hono) revealed that browser and Node.js environments handle FormData iteration differently. Solution: pass plain objects, let Hono create FormData internally.

### Real-time Synchronization

```typescript
// Appwrite real-time subscriptions
const unsubscribe = databases.subscribe(
  "tasks",
  ["databases.*.collections.*.documents.*"],
  (response) => {
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ["tasks"] });

    // Optimistic UI updates
    queryClient.setQueryData(["tasks"], (old) =>
      updateTaskInList(old, response.payload),
    );
  },
);
```

## Future Roadmap

### 1. Webhook System

Enable external services to react to task lifecycle events:

```typescript
app.post("/webhooks", async (c) => {
  const { event, target, conditions } = await c.req.json();

  await webhookService.register({
    event: "task.created",
    target: "https://api.slack.com/webhooks/...",
    conditions: { priority: "high" },
  });

  return c.json({ id: webhookId, status: "active" });
});
```

Automate cross-platform workflows: task created → post to #announcements, PR merged → auto-complete task, file uploaded → backup to cloud storage.

### 2. AI-Powered Automation

Leverage LLMs for intelligent task extraction from conversations:

```typescript
app.post("/ai/suggest", async (c) => {
  const { context } = await c.req.json();

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "Extract tasks from conversation" },
      { role: "user", content: context },
    ],
  });

  return c.json({
    suggestions: JSON.parse(completion.choices[0].message.content),
  });
});
```

Auto-create tasks from meeting notes, suggest assignees based on expertise, estimate durations from historical data.

### 3. Advanced Integrations

Bidirectional sync with GitHub/Linear/Jira:

```typescript
app.post("/integrations/sync", async (c) => {
  const sync = new SyncService(provider, credentials);
  await sync.configure({ direction: "bidirectional" });
  return c.json({ status: "syncing" });
});
```

Link tasks to PRs/issues, auto-complete on merge, PR status badges in task view, branch creation from tasks.

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE) for details.

---

_Built with Hand and OpenClaw_
