"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2, Plus, Upload, ShieldCheck, Mail } from "lucide-react";

import { type AppUser } from "@/lib/schema";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { UserAvatar } from "@/components/workspace/UserAvatar";
import { cn } from "@/lib/utils";

type UserManagementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppUser[];
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
  onAdd: (user: Omit<AppUser, "id">) => void;
  onEdit: (id: string, patch: Partial<Omit<AppUser, "id">>) => void;
  onDelete: (id: string) => void;
};

export function UserManagementDialog({
  open,
  onOpenChange,
  users,
  currentUserId,
  currentUserIsAdmin,
  onAdd,
  onEdit,
  onDelete,
}: UserManagementDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const handleStartAdd = () => {
    setEditingId(null);
    setAdding(true);
  };

  const handleStartEdit = (id: string) => {
    setAdding(false);
    setEditingId(id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setAdding(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ユーザー管理</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {users.map((user) =>
              editingId === user.id ? (
                <UserForm
                  key={user.id}
                  initial={user}
                  isNew={false}
                  onSave={(data) => {
                    onEdit(user.id, data);
                    setEditingId(null);
                  }}
                  onCancel={handleCancel}
                />
              ) : (
                <UserRow
                  key={user.id}
                  user={user}
                  isCurrent={user.id === currentUserId}
                  canDelete={user.id !== currentUserId}
                  showActions={currentUserIsAdmin}
                  onEdit={() => handleStartEdit(user.id)}
                  onDelete={() => setDeleteTarget(user)}
                />
              ),
            )}

            {adding && (
              <UserForm
                isNew={true}
                onSave={(data) => {
                  onAdd(data);
                  setAdding(false);
                }}
                onCancel={handleCancel}
              />
            )}

            {!adding && currentUserIsAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5 self-start"
                onClick={handleStartAdd}
              >
                <Plus className="h-3.5 w-3.5" />
                ユーザーを追加
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="ユーザーを削除"
        itemName={deleteTarget?.slackName ?? deleteTarget?.email ?? ""}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

// ===== ユーザー行 =====

function UserRow({
  user,
  isCurrent,
  canDelete,
  showActions,
  onEdit,
  onDelete,
}: {
  user: AppUser;
  isCurrent: boolean;
  canDelete: boolean;
  showActions: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayName = user.slackName || user.name || user.email || "???";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <UserAvatar user={user} size="md" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">@{displayName}</span>
          {user.isAdmin && (
            <span className="flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <ShieldCheck className="h-2.5 w-2.5" />
              管理者
            </span>
          )}
          {isCurrent && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ログイン中
            </span>
          )}
        </div>
        {user.email && (
          <span className="text-xs text-muted-foreground">{user.email}</span>
        )}
      </div>
      {showActions && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="編集"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className={cn(
              "rounded p-1.5",
              canDelete
                ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : "cursor-not-allowed opacity-30",
            )}
            title={canDelete ? "削除" : "ログイン中のユーザーは削除できません"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ===== 追加・編集フォーム =====

type UserFormProps = {
  initial?: AppUser;
  isNew: boolean;
  onSave: (data: Omit<AppUser, "id">) => void;
  onCancel: () => void;
};

function UserForm({ initial, isNew, onSave, onCancel }: UserFormProps) {
  const [slackName, setSlackName] = useState(initial?.slackName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [avatarDataUrl, setAvatarDataUrl] = useState(initial?.avatarDataUrl ?? "");
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const canSave = slackName.trim().length > 0;

  const handleSave = (sendInvite: boolean) => async () => {
    const data: Omit<AppUser, "id"> = {
      name: slackName.trim(),
      slackName: slackName.trim(),
      email: email.trim() || undefined,
      avatarDataUrl: avatarDataUrl || undefined,
      isAdmin,
    };
    setIsDirty(false);
    onSave(data);

    if (sendInvite && email.trim()) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            shouldCreateUser: true,
          },
        });
        if (error) {
          setInviteError(`招待メール送信失敗: ${error.message}`);
        } else {
          setInviteSent(true);
        }
      } catch {
        setInviteError("招待メール送信中にエラーが発生しました");
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-card px-3 py-3">
      <p className="text-xs font-semibold text-muted-foreground">
        {initial ? "ユーザーを編集" : "新しいユーザー"}
      </p>

      {inviteSent && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          招待メールを送信しました
        </div>
      )}
      {inviteError && (
        <p className="text-xs text-destructive">{inviteError}</p>
      )}

      {/* アバター */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              alt="アバター"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground ring-2 ring-border">
              {slackName ? slackName[0].toUpperCase() : "?"}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            画像をアップロード
          </Button>
          {avatarDataUrl && (
            <button
              type="button"
              onClick={() => setAvatarDataUrl("")}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              削除
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* Slack名 */}
      <div className="flex items-center gap-2">
        <label className="w-24 shrink-0 text-xs text-muted-foreground">Slack 名 *</label>
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">@</span>
          <Input
            value={slackName}
            onChange={(e) => setSlackName(e.target.value)}
            placeholder="例: noriko.sugizaki"
            className="h-8 pl-6 text-sm"
            autoFocus={!initial}
          />
        </div>
      </div>

      {/* メールアドレス */}
      <div className="flex items-center gap-2">
        <label className="w-24 shrink-0 text-xs text-muted-foreground">メール</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          placeholder="例: noriko@example.com"
          className="h-8 text-sm"
        />
      </div>

      {/* 管理者 */}
      <div className="flex items-center gap-2">
        <label className="w-24 shrink-0 text-xs text-muted-foreground">管理者</label>
        <button
          type="button"
          onClick={() => { setIsAdmin((v) => !v); setIsDirty(true); }}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            isAdmin ? "bg-primary" : "bg-muted",
          )}
          role="switch"
          aria-checked={isAdmin}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              isAdmin ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* ボタン */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          variant={emailFocused || isDirty ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          disabled={!canSave}
          onClick={handleSave(false)}
        >
          保存
        </Button>
        {email.trim() && (
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={!canSave || emailFocused || isDirty}
            onClick={handleSave(true)}
          >
            <Mail className="h-3 w-3" />
            招待メールを送信
          </Button>
        )}
      </div>
    </div>
  );
}
