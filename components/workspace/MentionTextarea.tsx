"use client";

import { useRef, useState, useCallback } from "react";
import { type AppUser } from "@/lib/schema";
import { UserAvatar } from "@/components/workspace/UserAvatar";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (text: string) => void;
  users: AppUser[];
  placeholder?: string;
};

export function MentionTextarea({ onSubmit, users, placeholder = "コメントを入力…" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);

  const filteredUsers =
    mentionQuery !== null
      ? users
          .filter((u) => u.slackName.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 6)
      : [];

  // contenteditable の内容をプレーンテキストに変換（mention chip → @slackName）
  const getText = useCallback((): string => {
    if (!editorRef.current) return "";
    let text = "";
    const walk = (node: ChildNode) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent ?? "";
      } else if (node instanceof HTMLElement) {
        if (node.dataset.mention) {
          text += `@${node.dataset.mention}`;
        } else if (node.tagName === "BR") {
          text += "\n";
        } else {
          node.childNodes.forEach(walk);
        }
      }
    };
    editorRef.current.childNodes.forEach(walk);
    return text;
  }, []);

  const handleInput = useCallback(() => {
    const text = getText();
    setIsEmpty(text.trim() === "");

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;

    const beforeCursor = (range.startContainer.textContent ?? "").slice(0, range.startOffset);
    const match = beforeCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, [getText]);

  const insertMention = useCallback(
    (user: AppUser) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const offset = range.startOffset;
      const fullText = textNode.textContent ?? "";
      const beforeCursor = fullText.slice(0, offset);
      const match = beforeCursor.match(/@(\w*)$/);
      if (!match) return;

      const queryStart = offset - match[0].length;
      const beforeMention = fullText.slice(0, queryStart);
      const afterMention = fullText.slice(offset);

      // メンションチップを作成
      const chip = document.createElement("span");
      chip.className =
        "inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary leading-5";
      chip.contentEditable = "false";
      chip.dataset.mention = user.slackName;
      chip.textContent = `@${user.slackName}`;

      const beforeNode = document.createTextNode(beforeMention);
      const afterNode = document.createTextNode(afterMention || "");

      const parent = textNode.parentNode!;
      parent.replaceChild(afterNode, textNode);
      parent.insertBefore(chip, afterNode);
      parent.insertBefore(beforeNode, chip);

      // カーソルをチップの直後に移動
      const newRange = document.createRange();
      newRange.setStart(afterNode, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      setMentionQuery(null);
      setIsEmpty(false);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = getText().trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setIsEmpty(true);
    setMentionQuery(null);
  }, [getText, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Backspace でメンションチップを削除
      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (range.collapsed) {
            const { startContainer, startOffset } = range;
            // カーソルがテキストノードの先頭にあり、直前がチップの場合
            if (startContainer.nodeType === Node.TEXT_NODE && startOffset === 0) {
              const prev = startContainer.previousSibling;
              if (prev instanceof HTMLElement && prev.dataset.mention) {
                e.preventDefault();
                prev.parentNode?.removeChild(prev);
                handleInput();
                return;
              }
            }
            // カーソルが親要素内でチップの直後にある場合
            if (startContainer === editorRef.current || startContainer.nodeType !== Node.TEXT_NODE) {
              const children = Array.from((startContainer as Element).childNodes);
              const prevNode = children[startOffset - 1];
              if (prevNode instanceof HTMLElement && prevNode.dataset.mention) {
                e.preventDefault();
                prevNode.parentNode?.removeChild(prevNode);
                handleInput();
                return;
              }
            }
          }
        }
      }

      if (mentionQuery !== null && filteredUsers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filteredUsers[mentionIndex]);
          return;
        }
        if (e.key === "Escape") {
          setMentionQuery(null);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [mentionQuery, filteredUsers, mentionIndex, insertMention, handleSubmit],
  );

  return (
    <div className="relative flex flex-col gap-2">
      {/* メンションピッカー */}
      {mentionQuery !== null && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {filteredUsers.map((u, i) => (
            <button
              key={u.id}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                i === mentionIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <UserAvatar user={u} size="sm" />
              <span>@{u.slackName}</span>
            </button>
          ))}
        </div>
      )}

      {/* contenteditable エリア */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "leading-relaxed break-words",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none",
        )}
      />

      <button
        onClick={handleSubmit}
        disabled={isEmpty}
        className={cn(
          "self-end flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isEmpty
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-selection text-selection-foreground hover:bg-selection/90",
        )}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
        </svg>
        送信
      </button>
    </div>
  );
}
