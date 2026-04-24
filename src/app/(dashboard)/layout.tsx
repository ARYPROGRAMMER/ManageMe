import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CreateWorkspaceModal />
      <CreateProjectModal />
      <CreateTaskModal />
      <EditTaskModal />
      <div className="flex min-h-screen w-full">
        <div className="fixed left-0 top-0 hidden h-full overflow-y-auto border-r border-white/10 bg-black/45 backdrop-blur-2xl lg:block lg:w-[292px]">
          <Sidebar />
        </div>

        <div className="w-full lg:pl-[292px]">
          <div className="min-h-screen w-full">
            <Navbar />

            <main className="mx-auto flex h-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
