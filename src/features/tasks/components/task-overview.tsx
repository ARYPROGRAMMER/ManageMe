import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { OverviewProperty } from "./overview-property";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";
import { FILES_BUCKET_ID } from "@/config";

interface TaskOverviewProps {
  task: any;
}

interface TaskResource {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  transcription?: string | null;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
  const { open } = useEditTaskModal();
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
        .filter((entry:any): entry is TaskResource => Boolean(entry))
    : [];

  const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const appwriteProject = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

  return (
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
              <span className="text-sm font-medium capitalize">{task.priority}</span>
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
                {parsedResources.map((resource, index) => {
                  const fallbackName = `Attachment ${index + 1}`;
                  const fileName = resource.fileName || fallbackName;
                  const fileUrl =
                    resource.fileId && appwriteEndpoint && appwriteProject
                      ? `${appwriteEndpoint}/storage/buckets/${FILES_BUCKET_ID}/files/${resource.fileId}/view?project=${appwriteProject}`
                      : null;

                  return (
                    <div
                      key={`${resource.fileId ?? fileName}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{fileName}</span>
                        {resource.mimeType && (
                          <span className="text-xs text-muted-foreground">
                            {resource.mimeType}
                          </span>
                        )}
                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-white underline underline-offset-4"
                          >
                            Open
                          </a>
                        )}
                      </div>
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
        </div>
      </div>
    </div>
  );
};
