import React from "react";
import { DottedSeparator } from "./dotted-separator";
import Navigation from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import Projects from "./projects";
import { BrandLogo } from "./brand-logo";

function Sidebar() {
  return (
    <aside className="flex h-full w-full flex-col p-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-3">
        <BrandLogo />
      </div>
      <DottedSeparator className="my-5" />
      <WorkspaceSwitcher />
      <DottedSeparator className="my-5" />
      <Navigation />
      <DottedSeparator className="my-5" />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <Projects />
      </div>
    </aside>
  );
}

export default Sidebar;
