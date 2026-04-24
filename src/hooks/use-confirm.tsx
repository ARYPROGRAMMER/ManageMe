import { ResponsiveModal } from "@/components/responsive-modal";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

export const useConfirm = (
  title: string,
  message: string,
  variant: ButtonProps["variant"] = "primary"
): [() => JSX.Element, () => Promise<unknown>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = () => {
    return new Promise((resolve) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDialog = () => (
    <ResponsiveModal open={promise !== null} onOpenChange={handleClose}>
      <Card className="glass-panel-strong h-full w-full rounded-3xl border-white/15">
        <CardContent className="pt-8">
          <CardHeader className="p-0">
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>

          <div className="pt-4 w-full flex flex-col gap-y-2 lg:flex-row gap-x-2 items-center justify-end">
            <Button
              className="w-full lg:w-auto"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              className="w-full lg:w-auto"
              variant={variant}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </CardContent>
      </Card>
    </ResponsiveModal>
  );

  return [ConfirmationDialog, confirm];
};
