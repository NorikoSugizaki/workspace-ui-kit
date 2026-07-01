"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, Search, X } from "lucide-react";

import { type Customer, KANA_ROWS, getKanaRowLabel } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { AddCustomerDialog } from "@/components/workspace/AddCustomerDialog";
import { EditCustomerDialog } from "@/components/workspace/EditCustomerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SectionLabel } from "@/components/primitives";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import { cn } from "@/lib/utils";

type CustomerListPaneProps = {
  workspaceName: string;
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
  onAddCustomer: (name: string, furigana: string) => void;
  onEditCustomer: (id: string, name: string, furigana: string) => void;
  onDeleteCustomer: (id: string) => void;
};

const ROW_LABELS = KANA_ROWS.map((r) => r.label);

export function CustomerListPane({
  workspaceName,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
}: CustomerListPaneProps) {
  const [query, setQuery] = useState("");
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const filtered = customers
    .filter((c) => {
      const matchQuery =
        query === "" ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.furigana.includes(query);
      const matchRow =
        activeRow === null || getKanaRowLabel(c.furigana) === activeRow;
      return matchQuery && matchRow;
    })
    .sort((a, b) => a.furigana.localeCompare(b.furigana, "ja"));

  const handleClear = () => {
    setQuery("");
    setActiveRow(null);
  };

  const hasFilter = query !== "" || activeRow !== null;

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
      >
        <SidebarHeader className="border-b border-sidebar-border p-0">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {workspaceName}
            </h2>
            <Pane1Toggle />
          </div>
        </SidebarHeader>

        <SidebarContent className="flex flex-col gap-0 group-data-[collapsible=icon]:hidden">
          {/* ===== 操作 セクション ===== */}
          <div className="flex flex-col gap-2 border-b border-sidebar-border px-3 py-3">
            <SectionLabel>検索</SectionLabel>

            {/* 🔍 顧客を検索 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="顧客を検索…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-7 text-xs bg-white"
              />
            </div>

            {/* 行フィルターボタン */}
            <div className="flex flex-wrap gap-1.5">
              {ROW_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setActiveRow((prev) => (prev === label ? null : label))
                  }
                  className={cn(
                    "min-w-[3rem] rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    activeRow === label
                      ? "border-selection bg-selection text-selection-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-selection/50 hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
              {hasFilter && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-0.5 rounded-full border border-dashed border-muted-foreground/40 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                >
                  <X className="size-2.5" />
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* ===== 企業名 セクション ===== */}
          <div className="flex flex-col gap-0 overflow-y-auto flex-1 px-1 py-2">
            <div className="px-2 pb-1">
              <SectionLabel>企業名</SectionLabel>
            </div>

            {/* ＋ 企業を追加（リストの先頭） */}
            <div className="px-1 pb-1">
              <button
                type="button"
                onClick={() => setAddDialogOpen(true)}
                className="flex h-8 w-full items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-3.5 shrink-0" />
                企業を追加
              </button>
            </div>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {hasFilter ? "該当なし" : "企業がいません"}
              </p>
            ) : (
              <SidebarMenu>
                {filtered.map((customer) => {
                  const active = customer.id === selectedCustomerId;
                  return (
                    <SidebarMenuItem key={customer.id}>
                      <SidebarMenuButton
                        tooltip={`${customer.name}（${customer.furigana}）`}
                        isActive={active}
                        aria-current={active ? "page" : undefined}
                        onClick={() => onSelectCustomer(customer.id)}
                      >
                        <span className="truncate">{customer.name}</span>
                        <span
                          className={cn(
                            "ml-auto text-xs tabular-nums",
                            active
                              ? "text-sidebar-accent-foreground"
                              : "text-muted-foreground",
                          )}
                          title="商談数"
                        >
                          {customer.deals.length}
                        </span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <SidebarMenuAction showOnHover>
                              <MoreHorizontal />
                              <span className="sr-only">操作</span>
                            </SidebarMenuAction>
                          }
                        />
                        <DropdownMenuContent side="right" align="start">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      onClick={() => setEditTarget(customer)}
                                    >
                                      編集
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        setDeleteTarget({
                                          id: customer.id,
                                          name: customer.name,
                                        })
                                      }
                                    >
                                      削除
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </div>
        </SidebarContent>
      </Sidebar>

      <AddCustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={onAddCustomer}
      />

      <EditCustomerDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        initialName={editTarget?.name ?? ""}
        initialFurigana={editTarget?.furigana ?? ""}
        onSave={(name, furigana) => {
          if (editTarget) {
            onEditCustomer(editTarget.id, name, furigana);
            setEditTarget(null);
          }
        }}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="企業を削除しますか？"
        itemName={deleteTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteCustomer(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
