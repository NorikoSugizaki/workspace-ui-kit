"use client";

import { type AppUser } from "@/lib/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/workspace/UserAvatar";
import { ShieldCheck } from "lucide-react";

type UserPickerDialogProps = {
  open: boolean;
  users: AppUser[];
  onSelect: (userId: string) => void;
};

export function UserPickerDialog({ open, users, onSelect }: UserPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ようこそ！あなたは誰ですか？</DialogTitle>
          <DialogDescription>
            このブラウザで使用するアカウントを選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {users.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ユーザーが登録されていません
            </p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelect(user.id)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <UserAvatar user={user} size="md" />
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{user.name}</span>
                    {user.isAdmin && (
                      <span className="flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        管理者
                      </span>
                    )}
                  </div>
                  {user.slackName && (
                    <span className="text-xs text-muted-foreground">@{user.slackName}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
