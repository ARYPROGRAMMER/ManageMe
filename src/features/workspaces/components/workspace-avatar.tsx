import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface WorkspaceAvatarProps {
  image?: string;
  name: string;
  className?: string;
}

export const WorkspaceAvatar = ({
  image,
  name,
  className,
}: WorkspaceAvatarProps) => {
  if (image) {
    return (
      <div
        className={cn(
          "relative size-10 overflow-hidden rounded-xl border border-white/10",
          className
        )}
      >
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return (
    <Avatar className={cn("size-10 rounded-xl", className)}>
      <AvatarFallback className="rounded-xl bg-white text-lg font-bold uppercase text-black">
        {name[0]}
      </AvatarFallback>
    </Avatar>
  );
};
