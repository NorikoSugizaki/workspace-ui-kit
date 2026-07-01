"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Send, Pencil, Trash2, Check, X, SmilePlus } from "lucide-react";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

import { type Comment, type AppUser } from "@/lib/schema";
import { CUSTOMER_PANE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/primitives";
import { UserAvatar } from "@/components/workspace/UserAvatar";
import { MentionTextarea } from "@/components/workspace/MentionTextarea";
import { cn } from "@/lib/utils";

type CommentPaneProps = {
  customerId: string | null;
  comments: Comment[];
  currentUser: AppUser | null;
  users: AppUser[];
  pane4Open: boolean;
  onAddComment: (customerId: string, text: string) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  onReactComment: (id: string, emoji: string) => void;
};

export function CommentPane({
  customerId,
  comments,
  currentUser,
  users,
  pane4Open,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactComment,
}: CommentPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const customerComments = customerId
    ? comments.filter((c) => c.customerId === customerId)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [customerComments.length]);

  if (!pane4Open) return null;

  return (
    <div className="flex min-h-0 w-full flex-col border-l border-border bg-card">
      <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <SectionLabel>{CUSTOMER_PANE_LABELS.comments}</SectionLabel>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {customerComments.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {CUSTOMER_PANE_LABELS.noComments}
            </p>
          ) : (
            customerComments.map((comment) => (
              <CommentBubble
                key={comment.id}
                comment={comment}
                user={users.find((u) => u.slackName === comment.author || u.name === comment.author) ?? null}
                isOwn={comment.author === (currentUser?.slackName ?? currentUser?.name ?? CUSTOMER_PANE_LABELS.defaultAuthor)}
                canDelete={
                  comment.author === (currentUser?.slackName ?? currentUser?.name ?? CUSTOMER_PANE_LABELS.defaultAuthor) ||
                  (currentUser?.isAdmin ?? false)
                }
                currentUserName={currentUser?.slackName ?? currentUser?.name ?? CUSTOMER_PANE_LABELS.defaultAuthor}
                onEdit={(text) => onEditComment(comment.id, text)}
                onDelete={() => onDeleteComment(comment.id)}
                onReact={(emoji) => onReactComment(comment.id, emoji)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        {!customerId ? (
          <p className="text-center text-xs text-muted-foreground">
            顧客を選択するとメモを書けます
          </p>
        ) : (
          <MentionTextarea
            users={users}
            placeholder="コメントを入力… (Enter で送信)"
            onSubmit={(text) => {
              if (customerId) onAddComment(customerId, text);
            }}
          />
        )}
      </div>
    </div>
  );
}

// リンク・@メンションをレンダリングするコンポーネント
function CommentText({ text }: { text: string }) {
  const TOKEN_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(@\w+)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1] && match[2]) {
      // [label](url) リンク
      parts.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      // @メンション
      parts.push(
        <span
          key={key++}
          className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary leading-5"
        >
          {match[3]}
        </span>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

type CommentBubbleProps = {
  comment: Comment;
  user: AppUser | null;
  isOwn: boolean;
  canDelete: boolean;
  currentUserName: string;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
};

function CommentBubble({ comment, user, isOwn, canDelete, currentUserName, onEdit, onDelete, onReact }: CommentBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const date = new Date(comment.createdAt);
  const dateStr = date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleStartEdit = () => {
    setDraft(comment.text);
    setEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 0);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEdit(trimmed);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(comment.text);
    setEditing(false);
  };

  return (
    <div
      className="group flex flex-col gap-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ヘッダー行 */}
      <div className="flex items-center gap-2">
        <UserAvatar user={user} size="sm" />
        <span className="text-xs font-medium text-foreground">{comment.author}</span>
        <span className="text-xs text-muted-foreground">{dateStr}</span>
        {comment.editedAt && !editing && (
          <span className="text-[10px] text-muted-foreground/60">(編集済)</span>
        )}
        {/* 自分のコメント→編集・削除、管理者→削除のみ */}
        {(isOwn || canDelete) && !editing && (
          <div
            className={cn(
              "ml-auto flex items-center gap-0.5 transition-opacity",
              hovered ? "opacity-100" : "opacity-0",
            )}
          >
            {isOwn && (
              <button
                onClick={handleStartEdit}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="編集"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="削除"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 本文エリア */}
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") handleCancel();
            }}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex items-center gap-1.5 self-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2 text-xs"
              onClick={handleCancel}
            >
              <X className="h-3 w-3" />
              キャンセル
            </Button>
            <Button
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={handleSave}
              disabled={!draft.trim()}
            >
              <Check className="h-3 w-3" />
              保存
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-background px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
          <CommentText text={comment.text} />
        </div>
      )}

      {/* リアクション */}
      {!editing && (
        <ReactionBar
          reactions={comment.reactions ?? []}
          currentUserName={currentUserName}
          onReact={onReact}
        />
      )}
    </div>
  );
}

// ===== リアクションバー =====

type ReactionBarProps = {
  reactions: Comment["reactions"];
  currentUserName: string;
  onReact: (emoji: string) => void;
};

function ReactionBar({ reactions, currentUserName, onReact }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasAny = reactions.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const reacted = r.users.includes(currentUserName);
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(r.emoji)}
            title={r.users.join(", ")}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              reacted
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted",
            )}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{r.users.length}</span>
          </button>
        );
      })}

      {/* 絵文字ピッカーボタン */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          className={cn(
            "flex items-center justify-center rounded-full border px-1.5 py-0.5 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted hover:text-foreground outline-none",
            hasAny ? "border-border" : "border-dashed border-border opacity-0 group-hover:opacity-100",
          )}
          title="リアクションを追加"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0 shadow-xl" align="start" side="top">
          <Picker
            data={data}
            locale="ja"
            onEmojiSelect={(emoji: { native: string }) => {
              onReact(emoji.native);
              setPickerOpen(false);
            }}
            previewPosition="none"
            skinTonePosition="none"
            theme="light"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
