import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useCallback, useState, useEffect } from "react";
import { TaskStatus } from "../types";
import { KanbanColumnHeader } from "./kanban-column-header";
import { KanbanCard } from "./kanban-card";

const boards: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

type TaskState = {
  [key in TaskStatus]: any[];
};

interface DataKanbanProps {
  data: any[];
  onChange: (
    tasks: { $id: string; status: TaskStatus; position: number }[]
  ) => void;
}

export const DataKanban = ({ data, onChange }: DataKanbanProps) => {
  const [tasks, setTasks] = useState<TaskState>(() => {
    const initialTasks: any = {
      [TaskStatus.BACKLOG]: [],
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };

    data.forEach((task) => {
      initialTasks[task.status].push(task);
    });

    Object.keys(initialTasks).forEach((key) => {
      initialTasks[key as TaskStatus].sort(
        (a: any, b: any) => a.position - b.position
      );
    });

    return initialTasks;
  });

  useEffect(() => {
    const newTasks: any = {
      [TaskStatus.BACKLOG]: [],
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };

    data.forEach((task) => {
      newTasks[task.status].push(task);
    });

    Object.keys(newTasks).forEach((key) => {
      newTasks[key as TaskStatus].sort(
        (a: any, b: any) => a.position - b.position
      );
    });

    setTasks(newTasks);
  }, [data]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination } = result;
      const sourceStatus = source.droppableId as TaskStatus;
      const destStatus = destination.droppableId as TaskStatus;

      let updatesPayload: {
        $id: string;
        status: TaskStatus;
        position: number;
      }[] = [];

      setTasks((prevTasks) => {
        const newTasks = { ...prevTasks };

        const sourceColumn = [...newTasks[sourceStatus]];
        const [movedTask] = sourceColumn.splice(source.index, 1);

        if (!movedTask) {
          console.error("Moved task not found");
          return prevTasks;
        }

        const updatedTask =
          sourceStatus !== destStatus
            ? { ...movedTask, status: destStatus }
            : movedTask;

        newTasks[sourceStatus] = sourceColumn;

        const destColumn = [...newTasks[destStatus]];
        destColumn.splice(destination.index, 0, updatedTask);
        newTasks[destStatus] = destColumn;

        updatesPayload = [];

        updatesPayload.push({
          $id: updatedTask.$id,
          status: destStatus,
          position: Math.min((destination.index + 1) * 1000, 1_000_000),
        });

        newTasks[destStatus].forEach((task, index) => {
          if (task && task.$id !== updatedTask.$id) {
            const newPosition = Math.min((index + 1) * 1000, 1_000_000);

            if (task.position !== newPosition) {
              updatesPayload.push({
                $id: task.$id,
                status: destStatus,
                position: newPosition,
              });
            }
          }
        });

        if (sourceStatus !== destStatus) {
          newTasks[sourceStatus].forEach((task, index) => {
            if (task) {
              const newPosition = Math.min((index + 1) * 1000, 1_000_000);

              if (task.position !== newPosition) {
                updatesPayload.push({
                  $id: task.$id,
                  status: sourceStatus,
                  position: newPosition,
                });
              }
            }
          });
        }

        return newTasks;
      });

      onChange(updatesPayload);
    },
    [onChange]
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex overflow-x-auto">
        {boards.map((board) => {
          return (
            <div
              key={board}
              className="flex-1 mx-2 bg-muted p-1.5 rounded-md min-w-[200px]"
            >
              <KanbanColumnHeader
                board={board}
                taskCount={tasks[board].length}
              />
              <Droppable droppableId={board}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="py-1.5 min-h-[200px]"
                  >
                    {tasks[board].map((task, index) => (
                      <Draggable
                        key={task.$id}
                        draggableId={task.$id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                          >
                            <KanbanCard task={task} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
