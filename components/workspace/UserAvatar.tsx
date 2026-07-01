"use client";

import { type AppUser } from "@/lib/schema";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  user: AppUser | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-lg",
};

export function UserAvatar({ user, size = "sm", className }: UserAvatarProps) {
  const sizeClass = SIZE_MAP[size];
  const initial = user?.name?.[0]?.toUpperCase() ?? "?";

  if (user?.avatarDataUrl) {
    return (
      <img
        src={user.avatarDataUrl}
        alt={user.name}
        className={cn("rounded-full object-cover shrink-0", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground shrink-0",
        sizeClass,
        className,
      )}
    >
      {initial}
    </div>
  );
}
