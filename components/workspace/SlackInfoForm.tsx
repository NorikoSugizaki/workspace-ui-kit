"use client";

import { useState, useEffect, useCallback } from "react";
import emojiData from "@emoji-mart/data";
import { Check, ExternalLink, RotateCcw, Loader2, RefreshCw, AlertCircle } from "lucide-react";

import { type SlackInfo } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionLabel } from "@/components/primitives";
import { cn } from "@/lib/utils";

// ===== 型定義 =====

interface SlackUser { id: string; name: string; avatar: string; }
interface SlackFileData { name: string; thumb: string | null; url: string | null; mimetype: string; }
interface SlackMessageData {
  ts: string;
  user: SlackUser;
  text: string;
  files: SlackFileData[];
  replyCount: number;
  isRoot: boolean;
}

// ===== Props =====

type Props = {
  slackInfo: SlackInfo;
  onUpdate: (patch: Partial<SlackInfo>) => void;
};

export function SlackInfoForm({ slackInfo, onUpdate }: Props) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SlackChannelSection slackInfo={slackInfo} onUpdate={onUpdate} />
    </div>
  );
}

// ===== URL からワークスペース名を抽出（ヘッダー表示用） =====

function parseWorkspaceName(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".slack.com")) {
      return u.hostname.replace(".slack.com", "");
    }
    return "Slack";
  } catch {
    return "Slack";
  }
}

// ===== :emoji: → ネイティブ絵文字 or null（未解決） =====

function resolveEmoji(name: string): string | null {
  const entry = (emojiData as Record<string, unknown> & { emojis?: Record<string, { skins?: { native?: string }[] }> }).emojis?.[name];
  return entry?.skins?.[0]?.native ?? null;
}

// ===== Slack mrkdwn → React 要素 =====

function SlackText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  // 改行、リンク、メンション、絵文字、太字、イタリック、コードを処理
  const segments = text.split(/(<[^>]+>|\*[^*]+\*|_[^_]+_|`[^`]+`|:[a-z0-9_+\-]+:|\n)/g);
  for (const seg of segments) {
    if (!seg) continue;
    if (seg === "\n") {
      nodes.push(<br key={key++} />);
    } else if (/^<http[^>]+>$/.test(seg)) {
      const inner = seg.slice(1, -1);
      const [url, label] = inner.split("|");
      nodes.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 break-all hover:text-primary/80">
          {label ?? url}
        </a>
      );
    } else if (/^<@[A-Z0-9]+>$/.test(seg)) {
      // フォールバック: APIで解決済みのはずだが念のため
      nodes.push(<span key={key++} className="rounded bg-primary/10 px-1 py-0.5 text-primary font-medium">{seg}</span>);
    } else if (/^\*[^*]+\*$/.test(seg)) {
      nodes.push(<strong key={key++}>{seg.slice(1, -1)}</strong>);
    } else if (/^_[^_]+_$/.test(seg)) {
      nodes.push(<em key={key++}>{seg.slice(1, -1)}</em>);
    } else if (/^`[^`]+`$/.test(seg)) {
      nodes.push(<code key={key++} className="rounded bg-muted px-1 font-mono text-xs">{seg.slice(1, -1)}</code>);
    } else if (/^:[a-z0-9_+\-]+:$/.test(seg)) {
      const name = seg.slice(1, -1);
      const native = resolveEmoji(name);
      if (native) {
        nodes.push(<span key={key++}>{native}</span>);
      } else {
        // カスタム絵文字はバッジ表示
        nodes.push(
          <span key={key++} className="inline-flex items-center rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">
            :{name}:
          </span>
        );
      }
    } else {
      nodes.push(<span key={key++}>{seg}</span>);
    }
  }
  return <>{nodes}</>;
}

// ===== タイムスタンプ表示 =====

function formatTs(ts: string): string {
  try {
    const date = new Date(parseFloat(ts) * 1000);
    return date.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ===== ユーザーアバター =====

function UserAvatar({ user, size = "md" }: { user: SlackUser; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} className={cn("rounded shrink-0 object-cover", sz)} />;
  }
  return (
    <div className={cn("rounded bg-muted flex items-center justify-center font-semibold text-muted-foreground shrink-0", sz)}>
      {user.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

// ===== ファイル添付プレビュー =====

function FileAttachments({ files }: { files: SlackFileData[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {files.map((f, i) => {
        const isImage = f.mimetype.startsWith("image/");
        if (isImage && f.thumb) {
          return (
            <a key={i} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer"
              className="rounded border border-border overflow-hidden hover:opacity-90 transition-opacity">
              <img src={f.thumb} alt={f.name} className="max-h-40 max-w-xs object-cover" />
            </a>
          );
        }
        return (
          <a key={i} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2.5 py-1.5 text-xs hover:bg-muted transition-colors">
            <ExternalLink className="h-3 w-3 shrink-0" />
            {f.name}
          </a>
        );
      })}
    </div>
  );
}

// ===== メッセージバブル =====

function MessageBubble({ msg, compact = false }: { msg: SlackMessageData; compact?: boolean }) {
  return (
    <div className={cn("flex gap-2.5", compact ? "py-2" : "py-3")}>
      <UserAvatar user={msg.user} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
            {msg.user.name}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatTs(msg.ts)}</span>
        </div>
        <div className={cn("text-foreground leading-relaxed whitespace-pre-wrap break-words", compact ? "text-xs" : "text-sm")}>
          <SlackText text={msg.text} />
        </div>
        <FileAttachments files={msg.files} />
      </div>
    </div>
  );
}

// ===== メインセクション =====

type SectionProps = {
  slackInfo: SlackInfo;
  onUpdate: (patch: Partial<SlackInfo>) => void;
};

function SlackChannelSection({ slackInfo, onUpdate }: SectionProps) {
  const [local, setLocal] = useState({ channelUrl: slackInfo.channelUrl });
  const [hasChanges, setHasChanges] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const [messages, setMessages] = useState<SlackMessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // hydration後に親データが更新されたとき、未編集なら同期する
  useEffect(() => {
    if (!hasChanges) {
      setLocal({ channelUrl: slackInfo.channelUrl });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slackInfo.channelUrl]);

  const fetchThread = useCallback(async (url: string) => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slack/thread?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "取得に失敗しました");
        setMessages([]);
      } else {
        setMessages(data.messages ?? []);
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存済みURLがあれば起動時に自動取得
  useEffect(() => {
    if (slackInfo.channelUrl) {
      fetchThread(slackInfo.channelUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slackInfo.channelUrl]);

  const handleSave = () => {
    onUpdate(local);
    setHasChanges(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
    fetchThread(local.channelUrl);
  };

  const handleReset = () => {
    setLocal({ channelUrl: slackInfo.channelUrl });
    setHasChanges(false);
  };

  const rootMessage = messages.find((m) => m.isRoot) ?? messages[0] ?? null;
  const replies = messages.filter((m) => !m.isRoot);
  const workspaceName = parseWorkspaceName(local.channelUrl || slackInfo.channelUrl);

  return (
    <section className="flex flex-col gap-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <SectionLabel>SLACK情報</SectionLabel>
        <div className="flex items-center gap-2">
          {savedFeedback && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              保存しました
            </span>
          )}
          {hasChanges ? (
            <>
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" />
                元に戻す
              </Button>
              <Button size="sm" className="h-6 gap-1 px-2 text-xs" onClick={handleSave}>
                <Check className="h-3 w-3" />
                保存
              </Button>
            </>
          ) : slackInfo.channelUrl && (
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={() => fetchThread(slackInfo.channelUrl)}>
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              更新
            </Button>
          )}
        </div>
      </div>

      {/* URL 入力 */}
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors",
          hasChanges ? "border-primary/40" : "border-border",
        )}
        onFocus={() => setHasChanges(true)}
      >
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Slack URL</span>
          <Input
            value={local.channelUrl}
            onChange={(e) => { setLocal({ channelUrl: e.target.value }); setHasChanges(true); }}
            onFocus={() => setHasChanges(true)}
            placeholder="スレッドのリンクをコピー&ペースト"
            className="h-8 flex-1 bg-card font-mono text-xs"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoComplete="off"
            data-1p-ignore
          />
        </div>
      </div>

      {/* スレッド表示エリア */}
      {(loading || error || messages.length > 0) && (
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          {/* ヘッダーバー */}
          <div className="flex items-center gap-2 border-b border-border bg-[#3f0e40] px-4 py-2.5">
            <SlackLogo />
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-semibold text-white/90">{workspaceName}</span>
              {rootMessage && (
                <span className="text-[10px] text-white/60">スレッド</span>
              )}
            </div>
            <Button
              variant="ghost" size="sm"
              className="ml-auto h-7 gap-1.5 px-3 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => window.open(slackInfo.channelUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3 w-3" />
              Slackで開く
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              読み込み中...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-destructive/60" />
              <span className="text-destructive/80">{error}</span>
            </div>
          ) : (
            <div className="flex min-h-0" style={{ height: 480 }}>
              {/* 左: 親メッセージ */}
              <div className="flex min-w-0 flex-1 flex-col border-r border-border">
                <div className="border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">メッセージ</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="px-4">
                    {rootMessage ? (
                      <MessageBubble msg={rootMessage} />
                    ) : (
                      <p className="py-8 text-center text-xs text-muted-foreground">メッセージが見つかりません</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* 右: スレッド返信 */}
              <div className="flex w-72 shrink-0 flex-col">
                <div className="border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    スレッド {replies.length > 0 && <span className="ml-1 text-[10px] text-muted-foreground/60">{replies.length}件</span>}
                  </span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-border/50 px-3">
                    {replies.length > 0 ? (
                      replies.map((msg) => (
                        <MessageBubble key={msg.ts} msg={msg} compact />
                      ))
                    ) : (
                      <p className="py-8 text-center text-xs text-muted-foreground">返信はありません</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ===== Slack ロゴ SVG =====

function SlackLogo() {
  return (
    <svg viewBox="0 0 54 54" className="h-5 w-5 shrink-0" aria-hidden="true">
      <g fill="none" fillRule="evenodd">
        <path d="M19.712 26.318c0 2.68-2.167 4.849-4.848 4.849S10.016 29 10.016 26.318s2.167-4.848 4.848-4.848h4.848v4.848z" fill="#E01E5A"/>
        <path d="M22.164 26.318c0-2.68 2.167-4.848 4.848-4.848s4.848 2.168 4.848 4.848v12.134c0 2.68-2.167 4.848-4.848 4.848s-4.848-2.168-4.848-4.848V26.318z" fill="#E01E5A"/>
        <path d="M27.012 14.184c-2.68 0-4.848-2.168-4.848-4.848S24.332 4.488 27.012 4.488s4.848 2.168 4.848 4.848v4.848h-4.848z" fill="#36C5F0"/>
        <path d="M27.012 16.636c2.68 0 4.848 2.168 4.848 4.848s-2.168 4.848-4.848 4.848H14.878c-2.68 0-4.848-2.168-4.848-4.848s2.168-4.848 4.848-4.848h12.134z" fill="#36C5F0"/>
        <path d="M39.146 21.484c0-2.68 2.168-4.848 4.848-4.848s4.848 2.168 4.848 4.848-2.168 4.848-4.848 4.848h-4.848v-4.848z" fill="#2EB67D"/>
        <path d="M36.694 21.484c0 2.68-2.168 4.848-4.848 4.848s-4.848-2.168-4.848-4.848V9.35c0-2.68 2.168-4.848 4.848-4.848s4.848 2.168 4.848 4.848v12.134z" fill="#2EB67D"/>
        <path d="M31.846 33.618c2.68 0 4.848 2.168 4.848 4.848s-2.168 4.848-4.848 4.848-4.848-2.168-4.848-4.848v-4.848h4.848z" fill="#ECB22E"/>
        <path d="M31.846 31.166c-2.68 0-4.848-2.168-4.848-4.848s2.168-4.848 4.848-4.848h12.134c2.68 0 4.848 2.168 4.848 4.848s-2.168 4.848-4.848 4.848H31.846z" fill="#ECB22E"/>
      </g>
    </svg>
  );
}
