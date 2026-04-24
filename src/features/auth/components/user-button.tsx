"use client";

import { DottedSeparator } from "@/components/dotted-separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "../api/use-logout";
import { useCurrent } from "../api/use-current";
import { Loader, LogOut } from "lucide-react";

export const UserButton = () => {
  const { data: user, isLoading } = useCurrent();
  const { mutate, isPending } = useLogout();

  if (isLoading) {
    return (
      <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
        <Loader className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const { name, email } = user;
  const avatarFallback = name
    ? name.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase() ?? "U";
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="outline-none relative">
        <Avatar className="size-10 border border-white/15 transition hover:-translate-y-0.5 hover:border-white/30">
          <AvatarFallback className="flex items-center justify-center bg-white font-bold text-black">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-64"
        sideOffset={10}
      >
        <div className="flex flex-col items-center justify-center gap-2 px-2.5 py-4">
          <Avatar className="size-[52px] border border-white/15">
            <AvatarFallback className="flex items-center justify-center bg-white text-xl font-bold text-black">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center justify-center">
            <p className="text-sm font-semibold text-white">
              {name || "User"}
            </p>

            <p className="text-xs text-neutral-500">{email}</p>
          </div>
        </div>
        <DottedSeparator className="mb-1" />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => mutate()}
          className="flex h-10 cursor-pointer items-center justify-center font-medium text-red-200"
        >
          <LogOut className="size-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
