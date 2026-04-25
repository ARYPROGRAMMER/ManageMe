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
- Always include `?w={MANAGEME_WORKSPACE_ID}` on every OpenClaw API call.
- For large files, prefer `multipart/form-data` to avoid shell argument size limits.
- Never send shell placeholders in JSON (example: `"base64Data": "$(cat file.txt)"`); `base64Data` must contain the actual base64 string.

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

### Update Task (Compatibility)

Use this when your client updates task fields via `PATCH /task` instead of path params.

```http
PATCH {MANAGEME_API_URL}/api/oc/task?w={MANAGEME_WORKSPACE_ID}
x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}
Content-Type: application/json

{
  "taskId": "task_id_here",
  "description": "Updated notes",
  "status": "todo|in_progress|done"
}
```

Accepted task id aliases: `taskId`, `task_id`, `id`

### Upload Resource

Recommended for large files (multipart):

```bash
curl -X POST "{MANAGEME_API_URL}/api/oc/resource?w={MANAGEME_WORKSPACE_ID}" \
  -H "x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}" \
  -F "file=@./recording.m4a" \
  -F "taskId=task_id_here" \
  -F "transcription=Optional transcript"
```

JSON base64 payload:

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

Safe JSON workflow (no shell expansion at request time):

```bash
# Linux/macOS
base64 -w 0 ./document.pdf > ./document.b64.txt
cat > ./payload.json << 'JSON'
{
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "base64Data": "REPLACE_WITH_REAL_BASE64_CONTENT",
  "taskId": "task_id_here"
}
JSON
```

```powershell
# Windows PowerShell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:/path/document.pdf"))
$payload = @{
  fileName = "document.pdf"
  mimeType = "application/pdf"
  base64Data = $b64
  taskId = "task_id_here"
}
$payload | ConvertTo-Json -Compress | Set-Content -Path "payload.json" -Encoding utf8
curl.exe -X POST "{MANAGEME_API_URL}/api/oc/resource?w={MANAGEME_WORKSPACE_ID}" -H "x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}" -H "Content-Type: application/json" --data-binary "@payload.json"
```

Raw file bytes (`--data-binary`) with metadata headers:

```bash
curl -X POST "{MANAGEME_API_URL}/api/oc/resource?w={MANAGEME_WORKSPACE_ID}" \
  -H "x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}" \
  -H "Content-Type: application/octet-stream" \
  -H "x-file-name: document.pdf" \
  -H "x-mime-type: application/pdf" \
  -H "x-task-id: task_id_here" \
  --data-binary @./document.pdf
```

Raw base64 text body is also accepted:

```bash
curl -X POST "{MANAGEME_API_URL}/api/oc/resource?w={MANAGEME_WORKSPACE_ID}" \
  -H "x-openclaw-secret: {MANAGEME_OPENCLAW_SECRET}" \
  -H "Content-Type: text/plain" \
  -H "x-file-name: document.pdf" \
  -H "x-mime-type: application/pdf" \
  --data-binary @./file.base64.txt
```

Accepted aliases (server normalizes these automatically):

- File name: `fileName`, `filename`, `file_name`, `name`
- MIME type: `mimeType`, `mime_type`, `contentType`
- File bytes (base64): `base64Data`, `base64`, `data`, `fileData`
- Task link: `taskId`, `task_id`, `task`
- Transcript text: `transcription`, `transcript`, `text`

Upload constraints and behavior:

- Max file size: 15 MB (returns `413` above limit)
- Supported content types: `application/json`, `multipart/form-data`, `text/plain` (base64), `application/octet-stream` (raw file bytes)
- `mimeType` can be omitted; server infers type from file extension
- Base64 may be raw, data URL, URL-safe, and with/without padding
- JSON/base64 parsing tolerates escaped newlines like `\\n` and `\\r\\n`
- Unknown file types are stored as `application/octet-stream`

Transport selection guide:

- Prefer `multipart/form-data` when available.
- Use `application/octet-stream` when you can send raw file bytes with `--data-binary @file.ext`.
- Use `application/json` only when the tool must send structured JSON.

File preview behavior in ManageMe UI:

- Inline preview: images, PDF, audio, video, and text-like files
- Non-previewable formats: show open/download links
- Supported examples: `png`, `jpg`, `jpeg`, `webp`, `gif`, `svg`, `pdf`, `txt`, `md`, `json`, `csv`, `mp3`, `wav`, `ogg`, `m4a`, `mp4`, `mov`, `webm`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `zip`, `rar`, `7z`

Manual web fallback (if channel upload fails):

- Open the task details page in ManageMe web UI.
- Use the `Attachments` plus button (`Add File`) to upload manually.
- Confirm the file appears with `Open` and `Download` actions and preview where supported.

Canonical upload payload to prefer:

```json
{
  "fileName": "voice-note.m4a",
  "base64Data": "data:audio/mp4;base64,AAA...",
  "taskId": "task_id_here",
  "transcription": "Optional transcript"
}
```

The API response includes:

```json
{
  "success": true,
  "fileId": "...",
  "fileName": "...",
  "mimeType": "...",
  "attachedToTask": "task_id_or_null"
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
