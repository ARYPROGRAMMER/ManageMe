import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  PencilIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { ChangeEvent, useCallback, useRef } from "react";
import { OverviewProperty } from "./overview-property";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { toast } from "sonner";
import ErrorBoundary from "@/components/error-boundary";
import { Skeleton } from "@/components/skeleton";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";
import { useUploadTaskResource } from "../api/use-upload-task-resource";
import { useDeleteTaskResource } from "../api/use-delete-task-resource";

interface TaskOverviewProps {
  task: any;
}

interface TaskResource {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  transcription?: string | null;
}

type PreviewKind = "image" | "pdf" | "audio" | "video" | "text" | "other";

function detectPreviewKind(resource: TaskResource): PreviewKind {
  const mime = (resource.mimeType ?? "").toLowerCase();
  const fileName = (resource.fileName ?? "").toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || fileName.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";

  const isTextLikeMime =
    mime.startsWith("text/") ||
    [
      "application/json",
      "application/xml",
      "application/javascript",
      "application/x-javascript",
    ].includes(mime);
  const isTextLikeExtension = [
    ".txt",
    ".md",
    ".json",
    ".xml",
    ".csv",
    ".log",
    ".js",
    ".ts",
  ].some((extension) => fileName.endsWith(extension));

  if (isTextLikeMime || isTextLikeExtension) return "text";
  return "other";
}

function ResourceTypeIcon({ previewKind }: { previewKind: PreviewKind }) {
  if (previewKind === "image") return <ImageIcon className="size-4" />;
  if (previewKind === "audio") return <FileAudio className="size-4" />;
  if (previewKind === "video") return <FileVideo className="size-4" />;
  if (previewKind === "text") return <FileText className="size-4" />;
  return <FileArchive className="size-4" />;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
  const { open } = useEditTaskModal();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { mutate: uploadResource, isPending: isUploading } =
    useUploadTaskResource();
  const { mutate: deleteResource, isPending: isDeleting } =
    useDeleteTaskResource();
  const sourceLabelMap: Record<string, string> = {
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    slack: "Slack",
    discord: "Discord",
    openclaw: "OpenClaw",
    web: "Web",
  };
  const parsedResources: TaskResource[] = Array.isArray(task.resources)
    ? task.resources
        .map((entry: unknown) => {
          if (typeof entry === "string") {
            try {
              return JSON.parse(entry) as TaskResource;
            } catch {
              return null;
            }
          }

          if (entry && typeof entry === "object") {
            return entry as TaskResource;
          }

          return null;
        })
        .filter((entry: any): entry is TaskResource => Boolean(entry))
    : [];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    // Validate file size
    if (selectedFile.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15MB)");
      return;
    }

    uploadResource(
      {
        param: { taskId: task.$id },
        form: { file: selectedFile },
      },
      {
        onSettled: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      },
    );
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File too large (max 15MB)");
        return;
      }

      uploadResource({
        param: { taskId: task.$id },
        form: { file },
      });
    },
    [task.$id, uploadResource],
  );

  const handleDeleteResource = (fileId?: string) => {
    if (!fileId) {
      return;
    }

    deleteResource({
      param: {
        taskId: task.$id,
        fileId,
      },
    });
  };

  return (
    <ErrorBoundary>
      <div className="col-span-1 flex flex-col gap-y-4">
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-white">Overview</p>
              <p className="text-xs text-muted-foreground">
                Ownership, status, and attached context
              </p>
            </div>
            <Button
              onClick={() => open(task.$id)}
              size={"sm"}
              variant={"secondary"}
            >
              <PencilIcon className="mr-2 size-4" />
              Edit
            </Button>
          </div>

          <DottedSeparator className="my-4" />

          <div className="flex flex-col gap-y-3">
            <OverviewProperty label="Assignee">
              <MemberAvatar name={task.assignee.name} className="size-6" />
              <p className="text-sm font-medium">{task.assignee.name}</p>
            </OverviewProperty>

            <OverviewProperty label="Due Date">
              <TaskDate className="text-sm font-medium" value={task.dueDate} />
            </OverviewProperty>

            <OverviewProperty label="Status">
              <Badge variant={task.status}>
                {snakeCaseToTitleCase(task.status)}
              </Badge>
            </OverviewProperty>

            {task.priority && (
              <OverviewProperty label="Priority">
                <span className="text-sm font-medium capitalize">
                  {task.priority}
                </span>
              </OverviewProperty>
            )}

            {task.createdVia && (
              <OverviewProperty label="Created Via">
                <span className="text-sm font-medium">
                  {sourceLabelMap[task.createdVia] ?? task.createdVia}
                </span>
              </OverviewProperty>
            )}

            {parsedResources.length > 0 && (
              <OverviewProperty label="Attachments">
                <div className="flex flex-col gap-y-2 w-full">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="rounded-2xl border-2 border-dashed border-white/10 p-4 transition-colors hover:border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="size-4 mr-2" />
                        )}
                        Add File
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        or drag and drop
                      </span>
                    </div>
                  </div>
                  {parsedResources.map((resource, index) => {
                    const fallbackName = `Attachment ${index + 1}`;
                    const fileName = resource.fileName || fallbackName;
                    const fileUrl = resource.fileId
                      ? `/api/tasks/${task.$id}/resource/${resource.fileId}`
                      : null;
                    const previewKind = detectPreviewKind(resource);

                    return (
                      <div
                        key={`${resource.fileId ?? fileName}-${index}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-sm mt-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <ResourceTypeIcon previewKind={previewKind} />
                            {fileName}
                          </span>
                          {resource.mimeType && (
                            <span className="text-xs text-muted-foreground">
                              {resource.mimeType}
                            </span>
                          )}
                          {fileUrl && (
                            <>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-white underline underline-offset-4"
                              >
                                Open
                              </a>
                              <a
                                href={fileUrl}
                                download={fileName}
                                className="text-xs text-muted-foreground underline underline-offset-4"
                              >
                                Download
                              </a>
                              {resource.fileId && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  disabled={isDeleting}
                                  onClick={() =>
                                    handleDeleteResource(resource.fileId)
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                        {fileUrl && previewKind === "image" && (
                          <Image
                            src={fileUrl}
                            alt={fileName}
                            width={1200}
                            height={800}
                            unoptimized
                            className="mt-2 h-auto max-h-64 w-full rounded-xl border border-white/10 object-contain"
                            loading="lazy"
                          />
                        )}
                        {fileUrl && previewKind === "pdf" && (
                          <iframe
                            src={fileUrl}
                            title={`${fileName} preview`}
                            className="mt-2 h-64 w-full rounded-xl border border-white/10"
                          />
                        )}
                        {fileUrl && previewKind === "audio" && (
                          <audio
                            controls
                            className="mt-2 w-full"
                            preload="metadata"
                          >
                            <source
                              src={fileUrl}
                              type={resource.mimeType ?? "audio/*"}
                            />
                          </audio>
                        )}
                        {fileUrl && previewKind === "video" && (
                          <video
                            controls
                            preload="metadata"
                            className="mt-2 max-h-72 w-full rounded-xl border border-white/10"
                          >
                            <source
                              src={fileUrl}
                              type={resource.mimeType ?? "video/*"}
                            />
                          </video>
                        )}
                        {fileUrl && previewKind === "text" && (
                          <iframe
                            src={fileUrl}
                            title={`${fileName} preview`}
                            className="mt-2 h-56 w-full rounded-xl border border-white/10"
                          />
                        )}
                        {resource.transcription && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                            {resource.transcription}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </OverviewProperty>
            )}

            {parsedResources.length === 0 && !isUploading && (
              <OverviewProperty label="Attachments">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="rounded-2xl border-2 border-dashed border-white/10 p-6 text-center transition-colors hover:border-white/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="size-4 mr-2" />
                      )}
                      Add First File
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      or drag and drop here
                    </p>
                  </div>
                </div>
              </OverviewProperty>
            )}

            {isUploading && (
              <OverviewProperty label="Attachments">
                <div className="flex flex-col gap-y-2 w-full">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              </OverviewProperty>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
