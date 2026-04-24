---
name: manageme
description: ManageMe assistant skill for workspace tasks, projects, statuses, and attachments through the OpenClaw API.
---

# ManageMe Skill

Use this skill when the user asks to create, list, complete, update, or attach resources to ManageMe tasks or projects from an OpenClaw channel.

## Runtime Configuration

Required environment variables:

- `MANAGEME_API_URL` example: `http://localhost:3000`
- `MANAGEME_OPENCLAW_SECRET`
- `MANAGEME_WORKSPACE_ID`

Every request must include:

- Header: `x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}`
- Query: `?w={MANAGEME_WORKSPACE_ID}`

## Rules

- Only call `MANAGEME_API_URL + /api/oc/*` endpoints.
- Do not call browser routes, auth routes, workspace UI routes, or non-OpenClaw API routes.
- Keep user replies concise and operational.
- Never expose secrets, raw headers, stack traces, or internal payload dumps.
- If a file is provided, upload it through `/api/oc/resource` before confirming.

## Endpoints

### Health

```http
GET {MANAGEME_API_URL}/api/oc/ping?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
```

### List Projects

```http
GET {MANAGEME_API_URL}/api/oc/projects?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
```

### Create Project

```http
POST {MANAGEME_API_URL}/api/oc/project?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
Content-Type: application/json

{ "name": "Project name" }
```

### Create Task

```http
POST {MANAGEME_API_URL}/api/oc/task?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
Content-Type: application/json

{
  "title": "Task title",
  "description": "Optional notes",
  "dueDate": "ISO-8601 date string",
  "priority": "low|medium|high",
  "projectId": "optional project id",
  "assigneeId": "optional member id",
  "sourceChannel": "discord|telegram|slack|whatsapp|openclaw"
}
```

Use `name` as a fallback alias for `title` only when needed. If neither is present, ask for the task title.

### List Tasks

```http
GET {MANAGEME_API_URL}/api/oc/tasks?w={MANAGEME_WORKSPACE_ID}&status=all
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
```

Optional query parameters:

- `status=todo|in_progress|done|all`
- `projectId=<id>`
- `dueWithin=<Nh>` example: `24h`

### Complete Task

```http
PATCH {MANAGEME_API_URL}/api/oc/task/{taskId}/complete?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
```

### Update Task Status

```http
PATCH {MANAGEME_API_URL}/api/oc/task/{taskId}/status?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
Content-Type: application/json

{ "status": "todo|in_progress|done" }
```

### Upload Resource

```http
POST {MANAGEME_API_URL}/api/oc/resource?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
Content-Type: application/json

{
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "base64Data": "base64 string or data URL",
  "taskId": "optional task id",
  "transcription": "optional extracted text"
}
```

## Task Resolution

When the user refers to a task by name:

1. Fetch candidate tasks with `/api/oc/tasks`.
2. Prefer exact title matches, then close fuzzy matches.
3. If one match is clear, perform the action.
4. If multiple matches are plausible, ask the user to choose.

## Error Messages

- `401`: `Your ManageMe connection needs re-authorizing. Please check your settings.`
- `404`: `That workspace or item was not found. Please check your ManageMe configuration.`
- `413`: `That file is too large for upload.`
- Other: `Something went wrong reaching ManageMe. Try again in a moment.`
