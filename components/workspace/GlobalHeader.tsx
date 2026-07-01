"use client";

import { useState } from "react";
import { Settings, LogOut, ShieldCheck } from "lucide-react";

import { type AppUser } from "@/lib/schema";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/workspace/UserAvatar";
import { UserManagementDialog } from "@/components/workspace/UserManagementDialog";

type GlobalHeaderProps = {
  workspaceName: string;
  customerName: string | null;
  linkLabel: string | null;
  currentUser: AppUser | null;
  users: AppUser[];
  onSwitchUser: () => void;
  onAddUser: (user: Omit<AppUser, "id">) => void;
  onEditUser: (id: string, patch: Partial<Omit<AppUser, "id">>) => void;
  onDeleteUser: (id: string) => void;
};

export function GlobalHeader({
  workspaceName,
  customerName,
  linkLabel,
  currentUser,
  users,
  onSwitchUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: GlobalHeaderProps) {
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <Breadcrumb
          className="min-w-0 flex-1 overflow-hidden"
          aria-label="パンくず"
        >
          <BreadcrumbList className="flex-nowrap text-[11px]">
            <BreadcrumbItem className="shrink-0 text-muted-foreground">
              {workspaceName}
            </BreadcrumbItem>
            {customerName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="shrink-0">
                  {linkLabel ? (
                    <span className="text-muted-foreground">{customerName}</span>
                  ) : (
                    <BreadcrumbPage className="font-medium">
                      {customerName}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {linkLabel && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-medium">
                    {linkLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* ユーザーメニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors outline-none">
            <UserAvatar user={currentUser} size="sm" />
            {currentUser && (
              <span className="text-xs font-medium text-foreground hidden sm:block">
                {currentUser.name}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {currentUser && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold">{currentUser.name}</p>
                  {currentUser.slackName && (
                    <p className="text-[11px] text-muted-foreground">@{currentUser.slackName}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            {currentUser?.isAdmin && (
              <DropdownMenuItem onClick={() => setUserMgmtOpen(true)}>
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                ユーザー管理
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onSwitchUser}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              ユーザーを切り替え
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <UserManagementDialog
        open={userMgmtOpen}
        onOpenChange={setUserMgmtOpen}
        users={users}
        currentUserId={currentUser?.id ?? null}
        onAdd={onAddUser}
        onEdit={onEditUser}
        onDelete={onDeleteUser}
      />
    </>
  );
}
