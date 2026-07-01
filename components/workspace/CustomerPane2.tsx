"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, GripVertical, Info, Link2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { type Customer, type SelectedItem } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";

// ===== リンク種別プリセット =====

const LINK_PRESETS = [
  { label: "提案資料", icon: "powerpoint" },
  { label: "工数見積", icon: "excel" },
  { label: "図解", icon: "chrome" },
  { label: "契約書", icon: "word" },
  { label: "その他", icon: "link" },
] as const;

const ICON_OPTIONS = [
  { icon: "powerpoint", label: "PowerPoint" },
  { icon: "excel", label: "Excel" },
  { icon: "chrome", label: "Chrome" },
  { icon: "word", label: "Word" },
  { icon: "link", label: "リンク" },
] as const;

// ===== アイコンコンポーネント =====

function LinkTypeIcon({ icon, className }: { icon?: string; className?: string }) {
  if (icon === "powerpoint") {
    return (
      <svg viewBox="0 0 12 12" className={cn("shrink-0", className)} aria-hidden="true">
        <rect width="12" height="12" rx="2" fill="#D24726" />
        <text x="6" y="9" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">P</text>
      </svg>
    );
  }
  if (icon === "excel") {
    return (
      <svg viewBox="0 0 12 12" className={cn("shrink-0", className)} aria-hidden="true">
        <rect width="12" height="12" rx="2" fill="#217346" />
        <text x="6" y="9" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">X</text>
      </svg>
    );
  }
  if (icon === "word") {
    return (
      <svg viewBox="0 0 12 12" className={cn("shrink-0", className)} aria-hidden="true">
        <rect width="12" height="12" rx="2" fill="#2B579A" />
        <text x="6" y="9" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">W</text>
      </svg>
    );
  }
  if (icon === "chrome") {
    return (
      <svg viewBox="0 0 12 12" className={cn("shrink-0", className)} aria-hidden="true">
        {/* White background */}
        <circle cx="6" cy="6" r="5.5" fill="white" stroke="#e0e0e0" strokeWidth="0.3" />
        {/* Red top sector */}
        <path d="M6 0.5A5.5 5.5 0 0 1 11.5 6H6Z" fill="#EA4335" />
        {/* Yellow right sector */}
        <path d="M11.5 6A5.5 5.5 0 0 1 6 11.5L6 6Z" fill="#FBBC05" />
        {/* Green bottom-left sector */}
        <path d="M6 11.5A5.5 5.5 0 0 1 0.5 6H6Z" fill="#34A853" />
        {/* Blue top-left sector */}
        <path d="M0.5 6A5.5 5.5 0 0 1 6 0.5L6 6Z" fill="#4285F4" />
        {/* White ring */}
        <circle cx="6" cy="6" r="2.5" fill="white" />
        {/* Blue center */}
        <circle cx="6" cy="6" r="2" fill="#4285F4" />
      </svg>
    );
  }
  return <Link2 className={cn("shrink-0", className)} />;
}

// ===== 企業情報セクション用アイコン =====

function BasicLinkIcon({ label, isSelected, size = "md" }: { label: string; isSelected: boolean; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0";
  const color = isSelected ? "text-selection-foreground" : "text-muted-foreground";

  if (label === "Slack情報") {
    return (
      <svg viewBox="0 0 24 24" className={cn(cls)} aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#4A154B" />
        {/* Slack hashtag simplified */}
        <path d="M8.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM6 8.5H4.5a1.5 1.5 0 0 0 0 3H6v-3zm3 0v3h3v-3H9zm4.5 0v3H15a1.5 1.5 0 0 0 0-3h-1.5zM15.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9 14.5v3h3v-3H9zm-1.5 0H6a1.5 1.5 0 0 0 0 3h1.5v-3zm6 0v3H15a1.5 1.5 0 0 0 0-3h-1.5zM8.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="white" />
      </svg>
    );
  }

  if (label === "SFDC情報") {
    return (
      <svg viewBox="0 0 24 24" className={cn(cls)} aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#00A1E0" />
        {/* Salesforce cloud simplified */}
        <path d="M10 7.5a3.5 3.5 0 0 1 6.5 1.8A2.5 2.5 0 0 1 19 14h-1.5A2.5 2.5 0 0 1 16 14H8a2.5 2.5 0 0 1-.5-5 3.5 3.5 0 0 1 2.5-1.5z" fill="white" />
      </svg>
    );
  }

  // 基本情報 → Info アイコン
  return <Info className={cn(cls, color)} />;
}

// ===== アイコンピッカーポップオーバー =====

function IconPickerPopover({
  currentIcon,
  onChangeIcon,
  triggerClassName,
}: {
  currentIcon?: string;
  onChangeIcon: (icon: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-accent/70",
          triggerClassName,
        )}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        aria-label="アイコンを変更"
      >
        <LinkTypeIcon icon={currentIcon} className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" side="right" align="start">
        {ICON_OPTIONS.map((opt) => (
          <button
            key={opt.icon}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground",
              currentIcon === opt.icon && "bg-accent text-accent-foreground",
            )}
            onClick={() => { onChangeIcon(opt.icon); setOpen(false); }}
          >
            <LinkTypeIcon icon={opt.icon} className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ===== リンク追加ポップオーバー =====

function AddLinkPopover({
  onAdd,
  triggerClassName,
  showFolder = true,
}: {
  onAdd: (label: string, icon: string) => void;
  triggerClassName?: string;
  showFolder?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setCounts({});
  };

  const increment = (e: React.MouseEvent, label: string) => {
    e.stopPropagation();
    setCounts((prev) => ({ ...prev, [label]: (prev[label] ?? 0) + 1 }));
  };

  const decrement = (e: React.MouseEvent, label: string) => {
    e.stopPropagation();
    setCounts((prev) => ({ ...prev, [label]: Math.max(0, (prev[label] ?? 0) - 1) }));
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    LINK_PRESETS.forEach((preset) => {
      const count = counts[preset.label] ?? 0;
      for (let i = 0; i < count; i++) {
        onAdd(preset.label, preset.icon);
      }
    });
    setCounts({});
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent",
          triggerClassName,
        )}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        aria-label="追加"
      >
        <Plus className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" side="right" align="start">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">種別を選択</p>
        {showFolder && (
          <>
            <button
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onAdd("新しいフォルダ", "folder");
                setOpen(false);
              }}
            >
              <Folder className="h-4 w-4 fill-yellow-300 text-yellow-500" />
              <span>フォルダ</span>
            </button>
            <div className="my-1 border-t" />
          </>
        )}
        {LINK_PRESETS.map((preset) => {
          const count = counts[preset.label] ?? 0;
          return (
            <div
              key={preset.label}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm"
            >
              <LinkTypeIcon icon={preset.icon} className="h-4 w-4 shrink-0" />
              <span className="flex-1">{preset.label}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => decrement(e, preset.label)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-background hover:opacity-80 text-xs font-bold"
                >
                  −
                </button>
                <span className="w-5 text-center text-xs tabular-nums">{count}</span>
                <button
                  onClick={(e) => increment(e, preset.label)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-background hover:opacity-80 text-xs font-bold"
                >
                  ＋
                </button>
              </div>
            </div>
          );
        })}
        {totalCount > 0 && (
          <div className="mt-1 border-t pt-1 px-1">
            <button
              onClick={handleConfirm}
              className="w-full rounded bg-primary px-2 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {totalCount}件追加
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

type Props = {
  customer: Customer | null;
  selectedItem: SelectedItem;
  onSelectItem: (item: SelectedItem) => void;
  onAddDeal: (customerId: string, name: string) => void;
  onDeleteDeal: (customerId: string, dealId: string) => void;
  onAddDealLink: (customerId: string, dealId: string, label: string, url: string, icon?: string, parentId?: string) => void;
  onDeleteDealLink: (customerId: string, dealId: string, linkId: string) => void;
  onRenameDealLink: (customerId: string, dealId: string, linkId: string, label: string) => void;
  onChangeDealLinkIcon: (customerId: string, dealId: string, linkId: string, icon: string) => void;
  onReorderDealLinks: (customerId: string, dealId: string, linkIds: string[]) => void;
  onMoveDealLink: (customerId: string, dealId: string, linkId: string, parentId: string | null) => void;
};

function AddDealDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>商談を追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">商談名</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="例: C000188_課題解決提案"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>追加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== インライン編集可能なリンク行 =====

function EditableLinkRow({
  label,
  icon,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onChangeIcon,
  dragHandleListeners,
  dragActivatorRef,
}: {
  label: string;
  icon?: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newLabel: string) => void;
  onDelete: () => void;
  onChangeIcon: (icon: string) => void;
  dragHandleListeners?: ReturnType<typeof useSortable>["listeners"];
  dragActivatorRef?: ReturnType<typeof useSortable>["setActivatorNodeRef"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(label);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, label]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) onRename(trimmed);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(label);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 pl-4 pr-2 py-1">
        <IconPickerPopover currentIcon={icon} onChangeIcon={onChangeIcon} />
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") cancelEdit();
          }}
          className="h-6 flex-1 px-1 text-xs"
          autoComplete="off"
        />
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={commitRename}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={cancelEdit}>
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center pl-4 pr-1 py-1 hover:bg-accent hover:text-accent-foreground transition-colors",
        isSelected && "bg-selection text-selection-foreground",
      )}
    >
      {/* ドラッグハンドル（pl-4 の余白エリアに重ねて表示） */}
      {dragHandleListeners && (
        <div
          ref={dragActivatorRef}
          className="absolute left-0 flex h-full w-4 cursor-grab items-center justify-center opacity-0 group-hover:opacity-50 active:cursor-grabbing"
          {...dragHandleListeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      {/* アイコン（クリックでピッカーを開く） */}
      <IconPickerPopover
        currentIcon={icon}
        onChangeIcon={onChangeIcon}
        triggerClassName={isSelected ? "text-selection-foreground" : "text-muted-foreground"}
      />
      {/* ラベル（クリックで選択） */}
      <button
        onClick={onSelect}
        className="flex flex-1 min-w-0 items-center pl-1.5 text-left"
      >
        <span className="truncate text-sm">{label}</span>
      </button>
      {/* ホバー時のみ表示するアクションボタン */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          aria-label="リネーム"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="削除"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ===== ソータブルラッパー =====

function SortableLinkRow({
  id,
  ...props
}: {
  id: string;
  label: string;
  icon?: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newLabel: string) => void;
  onDelete: () => void;
  onChangeIcon: (icon: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(isDragging && "opacity-50")}
    >
      <EditableLinkRow
        {...props}
        dragHandleListeners={listeners}
        dragActivatorRef={setActivatorNodeRef}
      />
    </div>
  );
}

// ===== フォルダ行 =====

function FolderRow({
  label,
  isExpanded,
  isDropTarget = false,
  onToggle,
  onRename,
  onDelete,
  onAddLink,
  dragHandleListeners,
  dragActivatorRef,
}: {
  label: string;
  isExpanded: boolean;
  isDropTarget?: boolean;
  onToggle: () => void;
  onRename: (newLabel: string) => void;
  onDelete: () => void;
  onAddLink: (label: string, icon: string) => void;
  dragHandleListeners?: ReturnType<typeof useSortable>["listeners"];
  dragActivatorRef?: ReturnType<typeof useSortable>["setActivatorNodeRef"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(label);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, label]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 pl-4 pr-2 py-1">
        <Folder className="h-3.5 w-3.5 shrink-0 fill-yellow-300 text-yellow-500" />
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setDraft(label); setEditing(false); }
          }}
          className="h-6 flex-1 px-1 text-xs"
          autoComplete="off"
        />
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={commitRename}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => { setDraft(label); setEditing(false); }}>
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "group relative flex items-center pl-4 pr-1 py-1 hover:bg-accent hover:text-accent-foreground transition-colors",
      isDropTarget && "bg-blue-50 ring-1 ring-inset ring-blue-400 rounded",
    )}>
      {dragHandleListeners && (
        <div
          ref={dragActivatorRef}
          className="absolute left-0 flex h-full w-4 cursor-grab items-center justify-center opacity-0 group-hover:opacity-50 active:cursor-grabbing"
          {...dragHandleListeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="flex shrink-0 items-center gap-0.5 mr-1"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Folder className="h-3.5 w-3.5 fill-yellow-300 text-yellow-500" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="flex-1 min-w-0 text-left text-sm truncate"
      >
        {label}
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <AddLinkPopover onAdd={onAddLink} showFolder={false} />
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(label); }}
          aria-label="リネーム"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="削除"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function SortableFolderRow({
  id,
  ...props
}: {
  id: string;
  label: string;
  isExpanded: boolean;
  isDropTarget?: boolean;
  onToggle: () => void;
  onRename: (newLabel: string) => void;
  onDelete: () => void;
  onAddLink: (label: string, icon: string) => void;
}) {
  const { listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <FolderRow {...props} dragHandleListeners={listeners} dragActivatorRef={setActivatorNodeRef} />
    </div>
  );
}

export function CustomerPane2({
  customer,
  selectedItem,
  onSelectItem,
  onAddDeal,
  onDeleteDeal,
  onAddDealLink,
  onDeleteDealLink,
  onRenameDealLink,
  onChangeDealLinkIcon,
  onReorderDealLinks,
  onMoveDealLink,
}: Props) {
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  // フォルダはデフォルトで開いている。ユーザーが閉じたIDだけ記録する
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  // ドラッグ中にホバーしているフォルダID
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  const [addDealOpen, setAddDealOpen] = useState(false);

  // 削除確認ダイアログ
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<{
    customerId: string;
    dealId: string;
    linkId: string;
    label: string;
  } | null>(null);
  const [deleteDealTarget, setDeleteDealTarget] = useState<{
    customerId: string;
    dealId: string;
    name: string;
  } | null>(null);

  const requestDeleteLink = (customerId: string, dealId: string, linkId: string, label: string) => {
    setDeleteLinkTarget({ customerId, dealId, linkId, label });
  };
  const requestDeleteDeal = (customerId: string, dealId: string, name: string) => {
    setDeleteDealTarget({ customerId, dealId, name });
  };

  const isFolderOpen = (folderId: string) => !collapsedFolders.has(folderId);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleDeal = (dealId: string) => {
    setExpandedDeals((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  };

  if (!customer) {
    return (
      <div className="flex w-full flex-col items-center justify-center border-r text-sm text-muted-foreground">
        顧客を選択してください
      </div>
    );
  }

  const handleAddDeal = (name: string) => {
    onAddDeal(customer.id, name);
  };

  const BASIC_LINK_ORDER = ["基本情報", "Slack情報", "SFDC情報"];
  const sortedBasicLinks = customer.basicLinks
    .filter((l) => !l.parentId)
    .slice()
    .sort((a, b) => {
      const ai = BASIC_LINK_ORDER.indexOf(a.label);
      const bi = BASIC_LINK_ORDER.indexOf(b.label);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return (
    <div className="flex w-full flex-col border-r">
      <ScrollArea className="flex-1">
        {/* 基本情報 */}
        <div>
          <div className="flex h-8 items-center px-3">
            <button
              onClick={() => onSelectItem(null)}
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
            >
              企業情報
            </button>
          </div>
          {sortedBasicLinks.map((parent) => {
            const isParentSelected =
              selectedItem?.kind === "basicLink" && selectedItem.linkId === parent.id;
            const children = customer.basicLinks.filter((l) => l.parentId === parent.id);
            return (
              <div key={parent.id}>
                <div
                  className={`flex items-center transition-colors hover:bg-accent hover:text-accent-foreground ${
                    isParentSelected ? "bg-selection text-selection-foreground" : ""
                  }`}
                >
                  <button
                    onClick={() => onSelectItem({ kind: "basicLink", linkId: parent.id })}
                    className="flex flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm min-w-0"
                  >
                    <BasicLinkIcon label={parent.label} isSelected={isParentSelected} size="md" />
                    <span className="truncate">{parent.label}</span>
                  </button>
                </div>
                {children.map((child) => {
                  const isChildSelected =
                    selectedItem?.kind === "basicLink" && selectedItem.linkId === child.id;
                  return (
                    <div
                      key={child.id}
                      className={`flex items-center pl-6 transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isChildSelected ? "bg-selection text-selection-foreground" : ""
                      }`}
                    >
                      <button
                        onClick={() => onSelectItem({ kind: "basicLink", linkId: child.id })}
                        className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm min-w-0"
                      >
                        <BasicLinkIcon label={child.label} isSelected={isChildSelected} size="sm" />
                        <span className="truncate">{child.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 商談 */}
        <div className="mt-2">
          <div className="flex h-8 items-center justify-between px-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              商談
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setAddDealOpen(true)}
              aria-label="商談を追加"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {customer.deals.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">商談がありません</p>
          )}

          {customer.deals.map((deal) => {
            const isExpanded = expandedDeals.has(deal.id);
            return (
              <div key={deal.id}>
                {/* 商談行 */}
                <div className="group flex items-center gap-1 px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors">
                  <button
                    onClick={() => toggleDeal(deal.id)}
                    className="flex flex-1 items-center gap-1 min-w-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm">{deal.name}</span>
                  </button>
                  {/* 商談名の右の + ボタン（ホバー時表示） */}
                  <AddLinkPopover
                    onAdd={(label, icon) => {
                      onAddDealLink(customer.id, deal.id, label, "", icon);
                      setExpandedDeals((prev) => new Set([...prev, deal.id]));
                    }}
                    triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); requestDeleteDeal(customer.id, deal.id, deal.name); }}
                    aria-label="商談を削除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* リンク行（展開時） */}
                {isExpanded && (() => {
                  const topLevelLinks = deal.links.filter((l) => !l.parentId);
                  const childMap = new Map<string, typeof deal.links>();
                  deal.links.filter((l) => l.parentId).forEach((l) => {
                    if (!childMap.has(l.parentId!)) childMap.set(l.parentId!, []);
                    childMap.get(l.parentId!)!.push(l);
                  });

                  return (
                    <div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragOver={({ over, active }) => {
                          if (!over || active.id === over.id) { setOverFolderId(null); return; }
                          const overLink = topLevelLinks.find((l) => l.id === String(over.id));
                          setOverFolderId(overLink?.icon === "folder" ? String(over.id) : null);
                        }}
                        onDragEnd={(event: DragEndEvent) => {
                          setOverFolderId(null);
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;

                          const activeId = String(active.id);
                          const overId = String(over.id);
                          const overLink = topLevelLinks.find((l) => l.id === overId);
                          const activeLink = deal.links.find((l) => l.id === activeId);

                          // フォルダへのドロップ: parentId を設定してフォルダ内に移動
                          if (overLink?.icon === "folder" && activeLink && activeLink.icon !== "folder") {
                            onMoveDealLink(customer.id, deal.id, activeId, overId);
                            return;
                          }

                          // 通常の並べ替え
                          const sortableTop = topLevelLinks.filter((l) => l.icon === "folder" || (!l.isDefault && l.icon !== "folder"));
                          const oldIndex = sortableTop.findIndex((l) => l.id === activeId);
                          const newIndex = sortableTop.findIndex((l) => l.id === overId);
                          if (oldIndex !== -1 && newIndex !== -1) {
                            const newTop = arrayMove(sortableTop, oldIndex, newIndex);
                            const isDefaultLinks = topLevelLinks.filter((l) => l.isDefault);
                            const allOrdered = [
                              ...isDefaultLinks,
                              ...newTop,
                            ].flatMap((l) => [l.id, ...(childMap.get(l.id) ?? []).map((c) => c.id)]);
                            onReorderDealLinks(customer.id, deal.id, allOrdered);
                          }
                        }}
                      >
                        <SortableContext
                          items={topLevelLinks.filter((l) => !l.isDefault).map((l) => l.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {topLevelLinks.map((link) => {
                            const isSelected =
                              selectedItem?.kind === "dealLink" &&
                              selectedItem.dealId === deal.id &&
                              selectedItem.linkId === link.id;

                            // フォルダ
                            if (link.icon === "folder") {
                              const children = childMap.get(link.id) ?? [];
                              const folderOpen = isFolderOpen(link.id);
                              return (
                                <div key={link.id}>
                                  <SortableFolderRow
                                    id={link.id}
                                    label={link.label}
                                    isExpanded={folderOpen}
                                    isDropTarget={overFolderId === link.id}
                                    onToggle={() => toggleFolder(link.id)}
                                    onRename={(newLabel) => onRenameDealLink(customer.id, deal.id, link.id, newLabel)}
                                    onDelete={() => requestDeleteLink(customer.id, deal.id, link.id, link.label)}
                                    onAddLink={(label, icon) => {
                                      onAddDealLink(customer.id, deal.id, label, "", icon, link.id);
                                    }}
                                  />
                                  {folderOpen && (
                                    <div className="ml-4 border-l border-border">
                                      {children.length === 0 ? (
                                        <p className="pl-3 py-1 text-xs text-muted-foreground italic">
                                          リンクなし
                                        </p>
                                      ) : (
                                        <DndContext
                                          sensors={sensors}
                                          collisionDetection={closestCenter}
                                          onDragEnd={(event: DragEndEvent) => {
                                            const { active, over } = event;
                                            if (!over || active.id === over.id) return;
                                            const oldIndex = children.findIndex((c) => c.id === String(active.id));
                                            const newIndex = children.findIndex((c) => c.id === String(over.id));
                                            if (oldIndex !== -1 && newIndex !== -1) {
                                              const newChildren = arrayMove(children, oldIndex, newIndex);
                                              const allOrdered = topLevelLinks.flatMap((l) => {
                                                if (l.id === link.id) {
                                                  return [l.id, ...newChildren.map((c) => c.id)];
                                                }
                                                return [l.id, ...(childMap.get(l.id) ?? []).map((c) => c.id)];
                                              });
                                              onReorderDealLinks(customer.id, deal.id, allOrdered);
                                            }
                                          }}
                                        >
                                          <SortableContext
                                            items={children.map((c) => c.id)}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            {children.map((child) => {
                                              const isChildSelected =
                                                selectedItem?.kind === "dealLink" &&
                                                selectedItem.dealId === deal.id &&
                                                selectedItem.linkId === child.id;
                                              return (
                                                <SortableLinkRow
                                                  key={child.id}
                                                  id={child.id}
                                                  label={child.label}
                                                  icon={child.icon}
                                                  isSelected={isChildSelected}
                                                  onSelect={() => onSelectItem({ kind: "dealLink", dealId: deal.id, linkId: child.id })}
                                                  onRename={(newLabel) => onRenameDealLink(customer.id, deal.id, child.id, newLabel)}
                                                  onDelete={() => requestDeleteLink(customer.id, deal.id, child.id, child.label)}
                                                  onChangeIcon={(icon) => onChangeDealLinkIcon(customer.id, deal.id, child.id, icon)}
                                                />
                                              );
                                            })}
                                          </SortableContext>
                                        </DndContext>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // isDefault リンク：削除のみ可
                            if (link.isDefault) {
                              return (
                                <div
                                  key={link.id}
                                  className={cn(
                                    "group flex items-center pl-8 pr-1 py-1 hover:bg-accent hover:text-accent-foreground transition-colors",
                                    isSelected && "bg-selection text-selection-foreground",
                                  )}
                                >
                                  <button
                                    onClick={() => onSelectItem({ kind: "dealLink", dealId: deal.id, linkId: link.id })}
                                    className="flex flex-1 items-center gap-2 min-w-0 text-left"
                                  >
                                    <LinkTypeIcon
                                      icon={link.icon}
                                      className={cn("h-3 w-3", isSelected ? "text-selection-foreground" : "text-muted-foreground")}
                                    />
                                    <span className="truncate text-sm">{link.label}</span>
                                  </button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); requestDeleteLink(customer.id, deal.id, link.id, link.label); }}
                                    aria-label="削除"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            }

                            // ユーザー追加リンク：ドラッグ・リネーム・削除可
                            return (
                              <SortableLinkRow
                                key={link.id}
                                id={link.id}
                                label={link.label}
                                icon={link.icon}
                                isSelected={isSelected}
                                onSelect={() => onSelectItem({ kind: "dealLink", dealId: deal.id, linkId: link.id })}
                                onRename={(newLabel) => onRenameDealLink(customer.id, deal.id, link.id, newLabel)}
                                onDelete={() => requestDeleteLink(customer.id, deal.id, link.id, link.label)}
                                onChangeIcon={(icon) => onChangeDealLinkIcon(customer.id, deal.id, link.id, icon)}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                      {deal.links.length === 0 && (
                        <p className="pl-8 py-1 text-xs text-muted-foreground">リンクなし</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <AddDealDialog
        open={addDealOpen}
        onOpenChange={setAddDealOpen}
        onAdd={handleAddDeal}
      />

      <DeleteConfirmDialog
        open={deleteLinkTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteLinkTarget(null); }}
        title="リンクを削除"
        itemName={deleteLinkTarget?.label ?? ""}
        onConfirm={() => {
          if (deleteLinkTarget) {
            onDeleteDealLink(deleteLinkTarget.customerId, deleteLinkTarget.dealId, deleteLinkTarget.linkId);
            setDeleteLinkTarget(null);
          }
        }}
      />

      <DeleteConfirmDialog
        open={deleteDealTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteDealTarget(null); }}
        title="商談を削除"
        itemName={deleteDealTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteDealTarget) {
            onDeleteDeal(deleteDealTarget.customerId, deleteDealTarget.dealId);
            setDeleteDealTarget(null);
          }
        }}
      />
    </div>
  );
}
