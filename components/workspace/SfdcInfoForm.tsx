"use client";

import { useState, useEffect } from "react";
import { Check, ExternalLink, RotateCcw } from "lucide-react";

import { type SfdcInfo } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/primitives";
import { cn } from "@/lib/utils";

type Props = {
  sfdcInfo: SfdcInfo;
  onUpdate: (patch: Partial<SfdcInfo>) => void;
};

export function SfdcInfoForm({ sfdcInfo, onUpdate }: Props) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SfdcSection sfdcInfo={sfdcInfo} onUpdate={onUpdate} />
    </div>
  );
}

// ===== URL からオブジェクト種別・名称を抽出 =====

function parseSfdcUrl(url: string): { objectType: string; label: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("salesforce") && !u.hostname.includes("force.com") && !u.hostname.includes("lightning")) {
      return { objectType: "Salesforce", label: u.hostname };
    }
    // /lightning/r/ObjectType/RecordId/view または /ObjectType/RecordId/view
    const parts = u.pathname.split("/").filter(Boolean);
    const rIdx = parts.indexOf("r");
    if (rIdx !== -1 && parts[rIdx + 1]) {
      return { objectType: parts[rIdx + 1], label: parts[rIdx + 2] ?? parts[rIdx + 1] };
    }
    // fallback
    const objectType = parts.find((p) => /^[A-Z]/.test(p)) ?? "Record";
    return { objectType, label: objectType };
  } catch {
    return null;
  }
}

// ===== SFDC セクション =====

type SectionProps = {
  sfdcInfo: SfdcInfo;
  onUpdate: (patch: Partial<SfdcInfo>) => void;
};

function SfdcSection({ sfdcInfo, onUpdate }: SectionProps) {
  const [local, setLocal] = useState({ url: sfdcInfo.url });
  const [hasChanges, setHasChanges] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // hydration後に親データが更新されたとき、未編集なら同期する
  useEffect(() => {
    if (!hasChanges) {
      setLocal({ url: sfdcInfo.url });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfdcInfo.url]);

  const handleSave = () => {
    onUpdate(local);
    setHasChanges(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    setLocal({ url: sfdcInfo.url });
    setHasChanges(false);
  };

  const previewUrl = local.url || sfdcInfo.url;
  const parsed = parseSfdcUrl(previewUrl);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>SFDC情報</SectionLabel>
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
          <span className="w-24 shrink-0 text-xs text-muted-foreground">SFDC URL</span>
          <Input
            value={local.url}
            onChange={(e) => {
              setLocal({ url: e.target.value });
              setHasChanges(true);
            }}
            onFocus={() => setHasChanges(true)}
            placeholder="コピーしたリンク"
            className="h-8 flex-1 bg-card font-mono text-xs"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoComplete="off"
            data-1p-ignore
          />
        </div>
      </div>

      {/* プレビューエリア */}
      {previewUrl && (
        <SfdcPreview url={previewUrl} parsed={parsed} />
      )}
    </section>
  );
}

// ===== SFDC プレビューカード =====

type ParsedSfdc = { objectType: string; label: string } | null;

const SFDC_CLOUD_ICON = (
  <svg viewBox="0 0 58 38" className="h-5 w-8 shrink-0" aria-hidden="true" fill="white">
    <path d="M21.5 3.5C24.1 1.3 27.5 0 31.2 0c5.5 0 10.3 2.9 13 7.2.9-.4 1.9-.6 3-.6 4.3 0 7.8 3.5 7.8 7.8 0 .7-.1 1.4-.3 2C56.8 17.8 58 20.5 58 23.5 58 29.3 53.3 34 47.5 34H13C6.4 34 1 28.6 1 22c0-5.2 3.4-9.6 8.1-11.2C9.1 10.6 9 10.3 9 10c0-3.6 2.9-6.5 6.5-6.5 2.2 0 4.1 1.1 5.3 2.7L21.5 3.5z"/>
  </svg>
);

const STAGE_STEPS = ["01 リード", "02 発掘", "03 育成", "04 提案", "05 交渉", "06 受注", "07 完了"];
const QUICK_LINKS = [
  { label: "未対応 お客様連絡", count: 1, color: "bg-red-100 text-red-700" },
  { label: "応答商品", count: 1, color: "bg-blue-100 text-blue-700" },
  { label: "応答あり商品", count: 1, color: "bg-blue-100 text-blue-700" },
  { label: "応答あり商品の段階", count: 3, color: "bg-blue-100 text-blue-700" },
  { label: "見積", count: 0, color: "bg-gray-100 text-gray-500" },
  { label: "受注条件申請", count: 0, color: "bg-gray-100 text-gray-500" },
  { label: "取引先責任者の受電", count: 1, color: "bg-blue-100 text-blue-700" },
  { label: "ファイル", count: 0, color: "bg-gray-100 text-gray-500" },
  { label: "ニーズの確認", count: 10, color: "bg-blue-100 text-blue-700" },
  { label: "商談商品管理", count: 9, color: "bg-orange-100 text-orange-700" },
  { label: "パートナーステップ", count: 0, color: "bg-gray-100 text-gray-500" },
  { label: "ロゴ管理", count: 0, color: "bg-gray-100 text-gray-500" },
  { label: "メモ", count: 0, color: "bg-gray-100 text-gray-500" },
];

function SfdcPreview({ url, parsed }: { url: string; parsed: ParsedSfdc }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-[11px]">
      {/* ヘッダーバー（Salesforce ブルー） */}
      <div className="flex items-center gap-2 bg-[#0070d2] px-4 py-2.5">
        {SFDC_CLOUD_ICON}
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold text-white/90">Salesforce</span>
          {parsed && <span className="text-[10px] text-white/60">{parsed.objectType}</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 gap-1.5 px-3 text-xs text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="h-3 w-3" />
          SFDCで開く
        </Button>
      </div>

      {/* レコードヘッダー */}
      <div className="border-b border-border bg-[#f3f3f3] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-gray-500">商談名</p>
            <p className="text-sm font-bold text-gray-800">株式会社アクア商事　コンサルティング</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {["フォローする", "契約情報を見る", "編集", "承認申請"].map((label) => (
              <span
                key={label}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] text-gray-600 cursor-default"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* キーフィールド */}
        <div className="mt-3 grid grid-cols-4 gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
          {[
            { label: "取引先名", value: "株式会社アクア商事" },
            { label: "完了予定日", value: "2025/07/04" },
            { label: "セールス(競合上用金額)", value: "¥62,943" },
            { label: "担当所有者", value: "デモ　みなみ" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] text-gray-500">{label}</p>
              <p className="font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 関連リストのクイックリンク */}
      <div className="border-b border-border px-4 py-2">
        <p className="mb-1.5 font-semibold text-gray-600">関連リストのクイックリンク</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_LINKS.map(({ label, count, color }) => (
            <span key={label} className={`rounded px-1.5 py-0.5 ${color}`}>
              {label}（{count}）
            </span>
          ))}
        </div>
      </div>

      {/* フェーズ */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-px overflow-hidden rounded">
          {STAGE_STEPS.map((step, i) => {
            const isActive = i === 5;
            return (
              <div
                key={step}
                className={cn(
                  "relative flex flex-1 items-center justify-center py-1 text-[9px] font-medium",
                  isActive ? "bg-[#2e7d32] text-white" : "bg-[#66bb6a] text-white",
                )}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {/* 提案商品 */}
      <div className="px-4 py-3">
        <p className="mb-2 font-semibold text-gray-600">提案商品（1）</p>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-1 pr-3 text-left font-normal">提案商品名</th>
              <th className="py-1 pr-3 text-right font-normal">販売数量</th>
              <th className="py-1 pr-3 text-right font-normal">販売単価</th>
              <th className="py-1 text-right font-normal">小計（新規）</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-3 text-blue-600">コンサルオプション</td>
              <td className="py-1 pr-3 text-right">1</td>
              <td className="py-1 pr-3 text-right">¥0</td>
              <td className="py-1 text-right">¥5,294,200</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
