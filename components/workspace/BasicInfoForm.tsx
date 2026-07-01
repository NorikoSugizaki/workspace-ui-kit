"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, RotateCcw, Trash2, X } from "lucide-react";

import {
  type CustomerBasicInfo,
  type ContactPerson,
  type SmartHRInfo,
} from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SectionLabel } from "@/components/primitives";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const ACCEPTED_EXTS = ".jpg,.jpeg,.png,.gif,.webp,.svg";

type Props = {
  smartHRInfo: SmartHRInfo;
  basicInfo: CustomerBasicInfo;
  onUpdateSmartHR: (patch: Partial<SmartHRInfo>) => void;
  onUpdateField: (patch: Partial<Omit<CustomerBasicInfo, "contacts">>) => void;
  onUpdateContact: (contactId: string, patch: Partial<Omit<ContactPerson, "id">>) => void;
  onAddContact: () => void;
  onDeleteContact: (contactId: string) => void;
};

export function BasicInfoForm({
  smartHRInfo,
  basicInfo,
  onUpdateSmartHR,
  onUpdateField,
  onUpdateContact,
  onAddContact,
  onDeleteContact,
}: Props) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SmartHRSection smartHRInfo={smartHRInfo} onUpdate={onUpdateSmartHR} />
      <BasicInfoSection basicInfo={basicInfo} onUpdateField={onUpdateField} />
      <ContactsSection
        contacts={basicInfo.contacts}
        onUpdateContact={onUpdateContact}
        onAddContact={onAddContact}
        onDeleteContact={onDeleteContact}
      />
    </div>
  );
}

// ===== SmartHR 情報セクション =====

const TIER_OPTIONS = [
  { value: "EB", label: "EB：2000名～" },
  { value: "ME", label: "ME：501～2000名" },
  { value: "CB", label: "CB：201～500名" },
  { value: "GB", label: "GB：51～200名" },
];

const SHR_INTRO_OPTIONS = [
  { value: "既存", label: "既存" },
  { value: "新規", label: "新規" },
];

const CONSULTING_OPTIONS = [
  { value: "既存", label: "既存" },
  { value: "新規", label: "新規" },
];

const SALES_OPTIONS = [
  { value: "有（ME以上 5%）", label: "有（ME以上 5%）" },
  { value: "有（CB・GB 1%）", label: "有（CB・GB 1%）" },
  { value: "無", label: "無" },
];

// ===== Slack チップ UI =====

function SlackChip({ name, onRemove, variant = "slack" }: { name: string; onRemove: () => void; variant?: "slack" | "default" }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={variant === "slack"
        ? { backgroundColor: "#ddf2fb", color: "#1376a0" }
        : { backgroundColor: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" }
      }
    >
      @{name}
      <button
        type="button"
        aria-label={`${name} を削除`}
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
      >
        <X size={10} />
      </button>
    </span>
  );
}

/** セールス・CS 用（1名） */
function SlackSingleField({
  value,
  onChange,
  variant = "slack",
}: {
  value: string;
  onChange: (v: string) => void;
  variant?: "slack" | "default";
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = () => {
    const trimmed = draft.trim().replace(/^@/, "");
    if (trimmed) onChange(trimmed);
    setDraft("");
    setEditing(false);
  };

  if (value && !editing) {
    return (
      <div className="flex min-h-8 flex-wrap items-center gap-1">
        <SlackChip name={value} onRemove={() => onChange("")} variant={variant} />
      </div>
    );
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-white px-2 focus-within:ring-1 focus-within:ring-ring">
      <span className="select-none text-xs text-muted-foreground">@</span>
      <input
        ref={inputRef}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); confirm(); }
          if (e.key === "Escape") { setDraft(""); setEditing(false); }
        }}
        onBlur={confirm}
        placeholder="slackname"
        autoComplete="off"
        data-1p-ignore
        autoFocus={editing}
      />
    </div>
  );
}

/** コンサル用（複数名） */
function SlackMultiField({
  values,
  onChange,
  variant = "slack",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  variant?: "slack" | "default";
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = () => {
    const trimmed = draft.trim().replace(/^@/, "");
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  };

  return (
    <div
      className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-white px-2 py-1 focus-within:ring-1 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((v) => (
        <SlackChip
          key={v}
          name={v}
          onRemove={() => onChange(values.filter((x) => x !== v))}
          variant={variant}
        />
      ))}
      <div className="flex items-center gap-0.5">
        {(values.length === 0 || draft) && (
          <span className="select-none text-xs text-muted-foreground">@</span>
        )}
        <input
          ref={inputRef}
          className="w-20 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); confirm(); }
            if (e.key === "Escape") setDraft("");
            if (e.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={confirm}
          placeholder={values.length === 0 ? "slackname" : ""}
          autoComplete="off"
          data-1p-ignore
        />
      </div>
    </div>
  );
}

type SmartHRSectionProps = {
  smartHRInfo: SmartHRInfo;
  onUpdate: (patch: Partial<SmartHRInfo>) => void;
};

function SmartHRSection({ smartHRInfo, onUpdate }: SmartHRSectionProps) {
  const dropdownFields = [
    { key: "tier" as const,               label: "Tier",        options: TIER_OPTIONS },
    { key: "shrIntroduction" as const,    label: "SHR導入",     options: SHR_INTRO_OPTIONS },
    { key: "consultingContract" as const, label: "コンサル契約", options: CONSULTING_OPTIONS },
    { key: "salesRecord" as const,        label: "セールス計上", options: SALES_OPTIONS },
  ];

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel className="normal-case">SmartHR情報</SectionLabel>

      {/* ドロップダウン行 */}
      <div className="grid grid-cols-4 gap-3">
        {dropdownFields.map(({ key, label, options }) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Select
              value={smartHRInfo[key]}
              onValueChange={(v) => onUpdate({ [key]: v })}
            >
              <SelectTrigger
                className="h-8 w-full text-sm"
                style={smartHRInfo[key]
                  ? { backgroundColor: "#d4f4f5", color: "#0f7f85", borderColor: "#69d9de" }
                  : undefined
                }
              >
                <span className={cn(
                  "flex-1 truncate text-left text-sm",
                  !smartHRInfo[key] && "text-muted-foreground",
                )}>
                  {options.find((o) => o.value === smartHRInfo[key])?.label ?? "選択..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* 担当者行 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">セールス</span>
          <SlackMultiField
            values={smartHRInfo.sales ?? []}
            onChange={(v) => onUpdate({ sales: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">CS</span>
          <SlackMultiField
            values={smartHRInfo.cs ?? []}
            onChange={(v) => onUpdate({ cs: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">コンサル</span>
          <SlackMultiField
            values={smartHRInfo.consultants ?? []}
            onChange={(v) => onUpdate({ consultants: v })}
            variant="default"
          />
        </div>
      </div>
    </section>
  );
}

// ===== 基本情報セクション =====

type BasicInfoSectionProps = {
  basicInfo: CustomerBasicInfo;
  onUpdateField: (patch: Partial<Omit<CustomerBasicInfo, "contacts">>) => void;
};

function BasicInfoSection({ basicInfo, onUpdateField }: BasicInfoSectionProps) {
  const [local, setLocal] = useState({
    companyName: basicInfo.companyName,
    address: basicInfo.address,
    url: basicInfo.url,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // hydration後に親データが更新されたとき、未編集なら同期する
  useEffect(() => {
    if (!hasChanges) {
      setLocal({ companyName: basicInfo.companyName, address: basicInfo.address, url: basicInfo.url });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicInfo.companyName, basicInfo.address, basicInfo.url]);

  const handleSave = () => {
    onUpdateField(local);
    setHasChanges(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    setLocal({
      companyName: basicInfo.companyName,
      address: basicInfo.address,
      url: basicInfo.url,
    });
    setHasChanges(false);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>基本情報</SectionLabel>
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

      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors",
          hasChanges ? "border-primary/40" : "border-border",
        )}
        onFocus={() => setHasChanges(true)}
      >
        {(
          [
            { key: "companyName", label: "企業名", placeholder: "企業名を入力" },
            { key: "address",     label: "住所",   placeholder: "住所を入力" },
            { key: "url",         label: "URL",    placeholder: "https://..." },
          ] as const
        ).map(({ key, label, placeholder }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
            <Input
              value={local[key]}
              onChange={(e) => {
                setLocal((prev) => ({ ...prev, [key]: e.target.value }));
                setHasChanges(true);
              }}
              onFocus={() => setHasChanges(true)}
              placeholder={placeholder}
              className="h-8 flex-1 bg-card"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              autoComplete="off"
              data-1p-ignore
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ===== 担当者セクション =====

type ContactsSectionProps = {
  contacts: ContactPerson[];
  onUpdateContact: (contactId: string, patch: Partial<Omit<ContactPerson, "id">>) => void;
  onAddContact: () => void;
  onDeleteContact: (contactId: string) => void;
};

function ContactsSection({
  contacts,
  onUpdateContact,
  onAddContact,
  onDeleteContact,
}: ContactsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>担当者</SectionLabel>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={onAddContact}
        >
          <Plus className="h-3 w-3" />
          担当者を追加
        </Button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onUpdate={(patch) => onUpdateContact(contact.id, patch)}
            onDelete={() => onDeleteContact(contact.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ===== 担当者カード =====

type ContactCardProps = {
  contact: ContactPerson;
  onUpdate: (patch: Partial<Omit<ContactPerson, "id">>) => void;
  onDelete: () => void;
};

function ContactCard({ contact, onUpdate, onDelete }: ContactCardProps) {
  const [local, setLocal] = useState({
    name: contact.name,
    furigana: contact.furigana,
    role: contact.role,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [furiganaError, setFuriganaError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // hydration後に親データが更新されたとき、未編集なら同期する
  useEffect(() => {
    if (!hasChanges) {
      setLocal({ name: contact.name, furigana: contact.furigana, role: contact.role });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.name, contact.furigana, contact.role]);

  const HIRAGANA_RE = /^[ぁ-ゖゝゞー\s]*$/;

  const handleSave = () => {
    if (furiganaError) return;
    onUpdate(local);
    setHasChanges(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const handleReset = () => {
    setLocal({ name: contact.name, furigana: contact.furigana, role: contact.role });
    setHasChanges(false);
    setFuriganaError(null);
  };

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError("JPG・PNG・GIF・WebP・SVG のみ対応しています");
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const original = e.target?.result as string;
      // canvas でリサイズ・圧縮して localStorage 容量を節約
      const img = new window.Image();
      img.onload = () => {
        const MAX = 480;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { onUpdate({ imageDataUrl: original }); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        onUpdate({ imageDataUrl: compressed });
      };
      img.onerror = () => onUpdate({ imageDataUrl: original });
      img.src = original;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-2 transition-colors",
        hasChanges ? "border-primary/40" : "border-border",
      )}
      onFocus={() => { setHasChanges(true); setIsFocused(true); }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
          if (hasChanges && !furiganaError) {
            handleSave();
          }
        }
      }}
    >
      {/* 削除ボタン（右上・単独） */}
      <div className="flex justify-end">
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
          aria-label="担当者を削除"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 保存・元に戻すボタン（フォーカス中のみ） */}
      {isFocused && (
        <div className="flex items-center justify-end gap-1">
          {savedFeedback && (
            <span className="flex items-center gap-0.5 text-[10px] text-green-600 mr-auto">
              <Check className="h-3 w-3" />
              保存済み
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="元に戻す"
          >
            <RotateCcw className="h-3 w-3" />
            元に戻す
          </button>
          <button
            onClick={handleSave}
            disabled={!!furiganaError}
            className="flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="保存"
          >
            <Check className="h-3 w-3" />
            保存
          </button>
        </div>
      )}

      {/* フィールド */}
      <div className="flex flex-col gap-1">
        <Input
          value={local.name}
          onChange={(e) => { setLocal((prev) => ({ ...prev, name: e.target.value })); setHasChanges(true); }}
          onFocus={() => setHasChanges(true)}
          onBlur={() => { if (hasChanges && !furiganaError) handleSave(); }}
          placeholder="名前"
          aria-label="名前"
          className="h-7 bg-card text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          autoComplete="off"
          data-1p-ignore
        />
        <div className="flex flex-col gap-0.5">
          <Input
            value={local.furigana}
            onChange={(e) => {
              const v = e.target.value;
              setLocal((prev) => ({ ...prev, furigana: v }));
              setHasChanges(true);
              setFuriganaError(
                v && !HIRAGANA_RE.test(v) ? "ひらがなのみ入力できます" : null,
              );
            }}
            onFocus={() => setHasChanges(true)}
            onBlur={(e) => {
              const v = e.target.value;
              const err = v && !HIRAGANA_RE.test(v) ? "ひらがなのみ入力できます" : null;
              setFuriganaError(err);
              if (hasChanges && !err) handleSave();
            }}
            placeholder="ふりがな"
            aria-label="ふりがな"
            className={cn(
              "h-7 bg-card text-xs",
              furiganaError && "border-destructive focus-visible:ring-destructive",
            )}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoComplete="off"
            data-1p-ignore
          />
          {furiganaError && (
            <p className="text-[10px] text-destructive">{furiganaError}</p>
          )}
        </div>
        <Input
          value={local.role}
          onChange={(e) => { setLocal((prev) => ({ ...prev, role: e.target.value })); setHasChanges(true); }}
          onFocus={() => setHasChanges(true)}
          onBlur={() => { if (hasChanges && !furiganaError) handleSave(); }}
          placeholder="役職"
          aria-label="役職"
          className="h-7 bg-card text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          autoComplete="off"
          data-1p-ignore
        />
      </div>

      {/* 画像エリア */}
      {contact.imageDataUrl ? (
        <div className="group relative">
          <img
            src={contact.imageDataUrl}
            alt={contact.name || "担当者画像"}
            className="min-h-20 w-full rounded object-cover"
          />
          <button
            onClick={() => onUpdate({ imageDataUrl: undefined })}
            className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
            aria-label="画像を削除"
            title="画像を削除"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div
            className={cn(
              "flex min-h-28 flex-col items-center justify-center gap-1.5 rounded border border-dashed bg-muted/30 px-2 text-xs text-muted-foreground transition-colors",
              isDragging ? "border-primary bg-primary/5 text-primary" : "border-border",
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); setImageError(null); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className={cn("text-[11px]", isDragging && "text-primary")}>
              {isDragging ? "ここにドロップ" : "ここにファイルをドロップ"}
            </span>
            {!isDragging && (
              <>
                <span className="text-[10px] text-muted-foreground/60">または</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded border border-border bg-background px-3 py-1 text-[11px] text-foreground hover:bg-accent transition-colors"
                >
                  ファイルを選択
                </button>
              </>
            )}
          </div>
          {imageError && (
            <p className="text-[10px] text-destructive">{imageError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTS}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="担当者を削除"
        itemName={local.name || "この担当者"}
        onConfirm={() => {
          setDeleteDialogOpen(false);
          onDelete();
        }}
      />
    </div>
  );
}
