import { AlertTriangle } from "lucide-react";
import React from "react";

interface PageErrorProps {
  message: string;
}

const PageError = ({ message = "Something Went Wrong" }: PageErrorProps) => {
  return (
    <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-3xl p-8 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
        <AlertTriangle className="size-6 text-neutral-300" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
};

export default PageError;
