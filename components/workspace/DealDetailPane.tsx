"use client";

import { useState } from "react";
import { Check, ExternalLink, Link2, Loader2, RotateCcw, AlertCircle } from "lucide-react";

import {
  type Customer,
  type CustomerLink,
  type CustomerBasicInfo,
  type ContactPerson,
  type SmartHRInfo,
  type SlackInfo,
  type SfdcInfo,
  type Deal,
  type SelectedItem,
} from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionLabel } from "@/components/primitives";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";
import { BasicInfoForm } from "@/components/workspace/BasicInfoForm";
import { SlackInfoForm } from "@/components/workspace/SlackInfoForm";
import { SfdcInfoForm } from "@/components/workspace/SfdcInfoForm";
import { cn } from "@/lib/utils";

type DealDetailPaneProps = {
  customer: Customer | null;
  selectedItem: SelectedItem;
  activeDeal: Deal | null;
  activeLink: CustomerLink | null;
  pane4Open: boolean;
  onTogglePane4: () => void;
  onUpdateLink: (
    customerId: string,
    dealId: string,
    linkId: string,
    patch: Partial<Pick<CustomerLink, "label" | "url" | "icon">>,
  ) => void;
  onUpdateBasicLink: (
    customerId: string,
    linkId: string,
    patch: Partial<Pick<CustomerLink, "label" | "url" | "icon">>,
  ) => void;
  onUpdateBasicInfo: (
    customerId: string,
    patch: Partial<Omit<CustomerBasicInfo, "contacts">>,
  ) => void;
  onUpdateSmartHRInfo: (customerId: string, patch: Partial<SmartHRInfo>) => void;
  onUpdateSlackInfo: (customerId: string, patch: Partial<SlackInfo>) => void;
  onUpdateSfdcInfo: (customerId: string, patch: Partial<SfdcInfo>) => void;
  onUpdateBasicInfoContact: (
    customerId: string,
    contactId: string,
    patch: Partial<Omit<ContactPerson, "id">>,
  ) => void;
  onAddBasicInfoContact: (customerId: string) => void;
  onDeleteBasicInfoContact: (customerId: string, contactId: string) => void;
  onDeselectItem: () => void;
};

export function DealDetailPane({
  customer,
  selectedItem,
  activeDeal,
  activeLink,
  pane4Open,
  onTogglePane4,
  onUpdateLink,
  onUpdateBasicLink,
  onUpdateBasicInfo,
  onUpdateSmartHRInfo,
  onUpdateSlackInfo,
  onUpdateSfdcInfo,
  onUpdateBasicInfoContact,
  onAddBasicInfoContact,
  onDeleteBasicInfoContact,
  onDeselectItem,
}: DealDetailPaneProps) {
  const isBasicInfoView =
    selectedItem?.kind === "basicLink" && activeLink?.label === "基本情報";

  const isSlackInfoView =
    selectedItem?.kind === "basicLink" && activeLink?.label === "Slack情報";

  const isSfdcInfoView =
    selectedItem?.kind === "basicLink" && activeLink?.label === "SFDC情報";

  const headerLabel =
    selectedItem?.kind === "basicLink"
      ? (activeLink?.label ?? "基本情報")
      : activeDeal?.name ?? "詳細";

  const isEmpty = !customer || !selectedItem || !activeLink;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-border bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <button
          onClick={onDeselectItem}
          className="truncate text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
          disabled={isEmpty}
        >
          {isEmpty ? "詳細" : headerLabel}
        </button>
        <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
      </div>

      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {!customer
              ? "顧客を選択してください"
              : "左のリストから項目を選択してください"}
          </p>
        </div>
      ) : isBasicInfoView && customer.basicInfo ? (
        <ScrollArea className="flex-1">
          <BasicInfoForm
            key={customer.id}
            smartHRInfo={customer.smartHRInfo ?? { tier: "", shrIntroduction: "", consultingContract: "", salesRecord: "", sales: [], cs: [], consultants: [] }}
            basicInfo={customer.basicInfo}
            onUpdateSmartHR={(patch) => onUpdateSmartHRInfo(customer.id, patch)}
            onUpdateField={(patch) => onUpdateBasicInfo(customer.id, patch)}
            onUpdateContact={(contactId, patch) =>
              onUpdateBasicInfoContact(customer.id, contactId, patch)
            }
            onAddContact={() => onAddBasicInfoContact(customer.id)}
            onDeleteContact={(contactId) => onDeleteBasicInfoContact(customer.id, contactId)}
          />
        </ScrollArea>
      ) : isSlackInfoView ? (
        <ScrollArea className="flex-1">
          <SlackInfoForm
            key={customer.id}
            slackInfo={customer.slackInfo ?? { channelUrl: "", channelName: "", inviteStatus: "", note: "" }}
            onUpdate={(patch) => onUpdateSlackInfo(customer.id, patch)}
          />
        </ScrollArea>
      ) : isSfdcInfoView ? (
        <ScrollArea className="flex-1">
          <SfdcInfoForm
            key={customer.id}
            sfdcInfo={customer.sfdcInfo ?? { url: "" }}
            onUpdate={(patch) => onUpdateSfdcInfo(customer.id, patch)}
          />
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-6 p-6">
            {/* リンク詳細（Slack/SFDC と同じ構成） */}
            <DealLinkSection
              key={activeLink.id}
              link={activeLink}
              onUpdate={(patch) => {
                if (selectedItem.kind === "basicLink") {
                  onUpdateBasicLink(customer.id, activeLink.id, patch);
                } else {
                  onUpdateLink(customer.id, selectedItem.dealId, activeLink.id, patch);
                }
              }}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ===== 商談リンクセクション（Slack/SFDC と同構成） =====

type DealLinkSectionProps = {
  link: CustomerLink;
  onUpdate: (patch: Partial<Pick<CustomerLink, "label" | "url">>) => void;
};

function DealLinkSection({ link, onUpdate }: DealLinkSectionProps) {
  const [localUrl, setLocalUrl] = useState(link.url);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = () => {
    onUpdate({ url: localUrl });
    setHasChanges(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    setLocalUrl(link.url);
    setHasChanges(false);
  };

  const previewUrl = localUrl || link.url;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{link.label || "リンク"}</SectionLabel>
        <div className="flex items-center gap-2">
          {savedFeedback && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              保存しました
            </span>
          )}
          {hasChanges && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3" />
                元に戻す
              </Button>
              <Button size="sm" className="h-6 gap-1 px-2 text-xs" onClick={handleSave}>
                <Check className="h-3 w-3" />
                保存
              </Button>
            </>
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
          <span className="w-24 shrink-0 text-xs text-muted-foreground">URL</span>
          <Input
            value={localUrl}
            onChange={(e) => {
              const extracted = extractIframeSrc(e.target.value);
              setLocalUrl(extracted);
              setHasChanges(true);
            }}
            onFocus={() => setHasChanges(true)}
            placeholder="URLまたはSharePointの埋め込みコード"
            className="h-8 flex-1 bg-card font-mono text-xs"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoComplete="off"
            data-1p-ignore
          />
        </div>
      </div>

      {/* プレビューカード */}
      {previewUrl && (
        <LinkPreview label={link.label} url={previewUrl} />
      )}
    </section>
  );
}

// iframeタグから src URL を抽出する（SharePointの埋め込みコードをそのまま貼れるようにする）
function extractIframeSrc(value: string): string {
  const match = value.match(/src="([^"]+)"/);
  if (match) return match[1].replace(/&amp;/g, "&");
  return value;
}

// SharePoint 埋め込みURLを通常表示（編集モード）用URLに変換する
function toSharePointOpenUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("sharepoint.com") || u.hostname.includes("office.com")) {
      u.searchParams.set("action", "edit");
      // 埋め込み専用パラメータを除去
      ["wdAr", "wdAllowInteractivity", "wdHideGridlines", "wdHideHeaders",
       "wdDownloadButton", "wdInConfigurator", "edaebf"].forEach(p => u.searchParams.delete(p));
      return u.toString();
    }
  } catch { /* ignore */ }
  return url;
}

// ===== URL 種別判定 =====

function detectUrlType(url: string): "sharepoint" | "generic" {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes("sharepoint.com") || hostname.includes("office.com")) return "sharepoint";
  } catch { /* ignore */ }
  return "generic";
}

// SharePoint 共有リンクをembedview URLに変換を試みる
function toSharePointEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // /:w:/ /:x:/ /:p:/ /:b:/ etc. の共有リンクはそのまま action=embedview を付加
    if (/\/:[\w]:\//.test(u.pathname)) {
      u.searchParams.set("action", "embedview");
      return u.toString();
    }
    // _layouts/15/Doc.aspx 形式はそのまま
    if (u.pathname.includes("/_layouts/15/Doc.aspx")) {
      if (!u.searchParams.has("action")) u.searchParams.set("action", "embedview");
      return u.toString();
    }
  } catch { /* ignore */ }
  return url;
}

// ===== SharePoint iframe プレビュー =====

function SharePointEmbed({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const embedUrl = toSharePointEmbedUrl(url);

  return (
    <div className="relative" style={{ height: 520 }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>読み込み中...</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            SharePoint のセキュリティ設定により、直接表示できませんでした。
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            SharePoint で開く
          </Button>
        </div>
      )}
      <iframe
        key={embedUrl}
        src={embedUrl}
        className={cn(
          "h-full w-full border-0 transition-opacity duration-300",
          status === "loaded" ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        title="SharePoint プレビュー"
        allow="fullscreen"
      />
    </div>
  );
}

// ===== 汎用 iframe プレビュー =====

function GenericEmbed({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "blocked">("loading");

  return (
    <div className="relative" style={{ height: 520 }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>読み込み中...</span>
        </div>
      )}
      {status === "blocked" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            このサイトはセキュリティ設定により、直接表示できませんでした。
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            新しいタブで開く
          </Button>
        </div>
      )}
      <iframe
        key={url}
        src={url}
        className={cn(
          "h-full w-full border-0 transition-opacity duration-300",
          status === "loaded" ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("blocked")}
        title="プレビュー"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

// ===== 汎用リンクプレビューカード =====

function LinkPreview({ label, url }: { label: string; url: string }) {
  let hostname = "";
  const urlType = detectUrlType(url);
  try { hostname = new URL(url).hostname; } catch { /* ignore */ }

  const isSharePoint = urlType === "sharepoint";

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* ヘッダー */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border px-4 py-2.5",
          isSharePoint ? "bg-[#0078d4]" : "bg-muted/60",
        )}
      >
        {isSharePoint ? (
          /* SharePoint アイコン（簡易 SVG） */
          <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0 fill-white" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fillOpacity="0.25" />
            <text x="16" y="21" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">S</text>
          </svg>
        ) : (
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex min-w-0 flex-col">
          <span className={cn("text-xs font-semibold", isSharePoint ? "text-white" : "text-foreground")}>
            {label || "リンク"}
          </span>
          {hostname && (
            <span className={cn("truncate text-[10px]", isSharePoint ? "text-white/60" : "text-muted-foreground")}>
              {hostname}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "ml-auto h-7 gap-1.5 px-3 text-xs",
            isSharePoint
              ? "text-white/80 hover:bg-white/10 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => window.open(toSharePointOpenUrl(url), "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="h-3 w-3" />
          開く
        </Button>
      </div>

      {/* コンテンツエリア */}
      {isSharePoint ? (
        <SharePointEmbed url={url} />
      ) : (
        <GenericEmbed url={url} />
      )}
    </div>
  );
}
