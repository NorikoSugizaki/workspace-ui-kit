"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import {
  type Customer,
  type CustomerLink,
  type CustomerBasicInfo,
  type ContactPerson,
  type SmartHRInfo,
  type SlackInfo,
  type SfdcInfo,
  type Deal,
  type Comment,
  type AppUser,
  type SelectedItem,
  customersSchema,
  commentsSchema,
} from "@/lib/schema";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { CustomerListPane } from "@/components/workspace/CustomerListPane";
import { CustomerPane2 } from "@/components/workspace/CustomerPane2";
import { DealDetailPane } from "@/components/workspace/DealDetailPane";
import { CommentPane } from "@/components/workspace/CommentPane";
import { UserPickerDialog } from "@/components/workspace/UserPickerDialog";
import { CUSTOMER_PANE_LABELS } from "@/lib/labels";
import { supabase } from "@/lib/supabase";

// ===== ユニークID生成 =====
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ===== ペイン幅リサイズ =====

const PANE_WIDTHS_KEY = "paneWidths_v1";
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function loadPaneWidths() {
  try {
    const s = localStorage.getItem(PANE_WIDTHS_KEY);
    if (s) return JSON.parse(s) as { p1: number; p2: number; p4: number };
  } catch {}
  return { p1: 256, p2: 256, p4: 288 };
}

/** ペイン間のリサイズハンドル（横並びフレックス内の縦線） */
function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  return (
    <div
      className="w-[3px] shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors z-10 select-none"
      onPointerDown={(e) => {
        dragging.current = true;
        lastX.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const delta = e.clientX - lastX.current;
        lastX.current = e.clientX;
        onDrag(delta);
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    />
  );
}

/** ペイン1（サイドバー）右端に固定配置するリサイズハンドル */
function Pane1ResizeHandle({ width, onDrag }: { width: number; onDrag: (delta: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  return (
    <div
      style={{ left: width - 2 }}
      className="fixed top-0 bottom-0 w-[4px] z-50 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors select-none"
      onPointerDown={(e) => {
        dragging.current = true;
        lastX.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const delta = e.clientX - lastX.current;
        lastX.current = e.clientX;
        onDrag(delta);
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    />
  );
}

type WorkspaceProps = {
  initialCustomers: Customer[];
  initialComments: Comment[];
  initialUsers: AppUser[];
  workspace: { name: string; icon: string };
};

const CUSTOMERS_KEY = "workspace-customers-v1";
const COMMENTS_KEY = "workspace-comments-v1";
const CURRENT_USER_KEY = "workspace-current-user-v1";

function loadFromStorage<T>(key: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success && result.data !== undefined ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function Workspace({
  initialCustomers,
  initialComments,
  initialUsers,
  workspace,
}: WorkspaceProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Supabase 同期用 refs
  const latestCustomersRef = useRef<Customer[]>(initialCustomers);
  const prevCustomersRef = useRef<Customer[]>(initialCustomers);
  const pendingSyncIdsRef = useRef<Set<string>>(new Set());
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCommentsRef = useRef<Comment[]>(initialComments);
  latestCustomersRef.current = customers;

  useEffect(() => {
    // カレントユーザー
    const savedUserId = typeof window !== "undefined"
      ? localStorage.getItem(CURRENT_USER_KEY)
      : null;
    if (savedUserId) {
      setCurrentUserId(savedUserId);
    } else {
      setShowUserPicker(true);
    }
    // ペイン幅もクライアント側でのみ復元
    const savedPaneWidths = loadPaneWidths();
    setPane1Width(savedPaneWidths.p1);
    setPane2Width(savedPaneWidths.p2);
    setPane4Width(savedPaneWidths.p4);

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 顧客変更を Supabase に同期（デバウンス upsert + 即時 delete）
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevCustomersRef.current;
    prevCustomersRef.current = customers;

    // 削除された顧客を即時削除
    prev.forEach((prevC) => {
      if (!customers.find((c) => c.id === prevC.id)) {
        supabase.from("customers").delete().eq("id", prevC.id).then(({ error }) => {
          if (error) console.warn("顧客削除失敗:", error);
        });
      }
    });

    // 変更された顧客IDを pending に追加
    customers.forEach((c) => {
      const prevC = prev.find((p) => p.id === c.id);
      if (!prevC || JSON.stringify(prevC) !== JSON.stringify(c)) {
        pendingSyncIdsRef.current.add(c.id);
      }
    });

    if (pendingSyncIdsRef.current.size === 0) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const idsToSync = [...pendingSyncIdsRef.current];
      pendingSyncIdsRef.current.clear();
      const toSync = latestCustomersRef.current.filter((c) => idsToSync.includes(c.id));
      toSync.forEach((customer) => {
        console.log("[sync] upsert 開始:", customer.id);
        supabase.from("customers").upsert({
          id: customer.id,
          name: customer.name,
          furigana: customer.furigana,
          basic_links: customer.basicLinks,
          basic_info: customer.basicInfo ?? null,
          smarthr_info: customer.smartHRInfo ?? null,
          slack_info: customer.slackInfo ?? null,
          sfdc_info: customer.sfdcInfo ?? null,
          deals: customer.deals,
        }).then(({ error }) => {
          if (error) {
            console.error("[sync] 顧客同期失敗:", error);
          } else {
            console.log("[sync] 顧客同期成功:", customer.id);
          }
        });
      });
    }, 500);
  }, [customers, hydrated]);

  // コメント変更を Supabase に同期（即時）
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevCommentsRef.current;
    prevCommentsRef.current = comments;

    comments.forEach((c) => {
      const prevC = prev.find((p) => p.id === c.id);
      if (!prevC) {
        supabase.from("comments").insert({
          id: c.id,
          customer_id: c.customerId,
          text: c.text,
          author: c.author,
          created_at: c.createdAt,
          edited_at: c.editedAt ?? null,
          reactions: c.reactions,
        }).then(({ error }) => {
          if (error) console.warn("コメント追加失敗:", error);
        });
      } else if (JSON.stringify(prevC) !== JSON.stringify(c)) {
        supabase.from("comments").update({
          text: c.text,
          edited_at: c.editedAt ?? null,
          reactions: c.reactions,
        }).eq("id", c.id).then(({ error }) => {
          if (error) console.warn("コメント更新失敗:", error);
        });
      }
    });

    prev.forEach((prevC) => {
      if (!comments.find((c) => c.id === prevC.id)) {
        supabase.from("comments").delete().eq("id", prevC.id).then(({ error }) => {
          if (error) console.warn("コメント削除失敗:", error);
        });
      }
    });
  }, [comments, hydrated]);

  // ユーザーは /api/users (users.json) に保存するため localStorage への書き込みは行わない
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCustomers[0]?.id ?? null,
  );
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(() => {
    const first = initialCustomers[0];
    const basicInfoLink = first?.basicLinks.find((l) => l.label === "基本情報");
    return basicInfoLink ? { kind: "basicLink", linkId: basicInfoLink.id } : null;
  });
  const [pane4Open, setPane4Open] = useState(true);
  const DEFAULT_PANE_WIDTHS = { p1: 256, p2: 256, p4: 288 };
  const [pane1Width, setPane1Width] = useState(DEFAULT_PANE_WIDTHS.p1);
  const [pane2Width, setPane2Width] = useState(DEFAULT_PANE_WIDTHS.p2);
  const [pane4Width, setPane4Width] = useState(DEFAULT_PANE_WIDTHS.p4);

  useEffect(() => {
    try {
      localStorage.setItem(PANE_WIDTHS_KEY, JSON.stringify({ p1: pane1Width, p2: pane2Width, p4: pane4Width }));
    } catch {}
  }, [pane1Width, pane2Width, pane4Width]);

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? null;

  // 選択されたリンクを解決
  const resolveSelectedLink = (): CustomerLink | null => {
    if (!activeCustomer || !selectedItem) return null;
    if (selectedItem.kind === "basicLink") {
      return activeCustomer.basicLinks.find((l) => l.id === selectedItem.linkId) ?? null;
    }
    const deal = activeCustomer.deals.find((d) => d.id === selectedItem.dealId);
    return deal?.links.find((l) => l.id === selectedItem.linkId) ?? null;
  };

  const activeLink = resolveSelectedLink();
  const activeDeal =
    selectedItem?.kind === "dealLink"
      ? (activeCustomer?.deals.find((d) => d.id === selectedItem.dealId) ?? null)
      : null;

  // ===== 顧客 =====

  const selectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setCustomers((prev) => {
      const customer = prev.find((c) => c.id === id);
      const basicInfoLink = customer?.basicLinks.find((l) => l.label === "基本情報");
      if (basicInfoLink) {
        setSelectedItem({ kind: "basicLink", linkId: basicInfoLink.id });
      } else {
        setSelectedItem(null);
      }
      return prev;
    });
  }, []);

  const addCustomer = useCallback((name: string, furigana: string) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      furigana,
      basicLinks: [
        { id: uid("bl"), label: "基本情報", url: "", isDefault: true },
        { id: uid("bl"), label: "Slack情報", url: "", isDefault: true },
        { id: uid("bl"), label: "SFDC情報", url: "", isDefault: true },
      ],
      basicInfo: { companyName: name, address: "", url: "", contacts: [] },
      smartHRInfo: { tier: "", shrIntroduction: "", consultingContract: "", salesRecord: "", sales: [], cs: [], consultants: [] },
      slackInfo: { channelUrl: "", channelName: "", inviteStatus: "", note: "" },
      sfdcInfo: { url: "" },
      deals: [],
    };
    setCustomers((prev) => [...prev, newCustomer]);
    setSelectedCustomerId(newCustomer.id);
    setSelectedItem(null);
  }, []);

  const editCustomer = useCallback(
    (id: string, name: string, furigana: string) => {
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name, furigana } : c)),
      );
    },
    [],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      setCustomers((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (selectedCustomerId === id) {
          setSelectedCustomerId(next[0]?.id ?? null);
          setSelectedItem(null);
        }
        return next;
      });
    },
    [selectedCustomerId],
  );

  // ===== SmartHR 情報 =====

  const updateSmartHRInfo = useCallback(
    (customerId: string, patch: Partial<SmartHRInfo>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, smartHRInfo: { ...(c.smartHRInfo ?? { tier: "", shrIntroduction: "", consultingContract: "", salesRecord: "", sales: [], cs: [], consultants: [] }), ...patch } }
            : c,
        ),
      );
    },
    [],
  );

  // ===== Slack 情報 =====

  const updateSlackInfo = useCallback(
    (customerId: string, patch: Partial<SlackInfo>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, slackInfo: { ...(c.slackInfo ?? { channelUrl: "", channelName: "", inviteStatus: "", note: "" }), ...patch } }
            : c,
        ),
      );
    },
    [],
  );

  const updateSfdcInfo = useCallback(
    (customerId: string, patch: Partial<SfdcInfo>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, sfdcInfo: { ...(c.sfdcInfo ?? { url: "" }), ...patch } }
            : c,
        ),
      );
    },
    [],
  );

  // ===== 基本情報（構造化フォーム） =====

  const updateBasicInfo = useCallback(
    (customerId: string, patch: Partial<Omit<CustomerBasicInfo, "contacts">>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId && c.basicInfo
            ? { ...c, basicInfo: { ...c.basicInfo, ...patch } }
            : c,
        ),
      );
    },
    [],
  );

  const updateBasicInfoContact = useCallback(
    (customerId: string, contactId: string, patch: Partial<Omit<ContactPerson, "id">>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId && c.basicInfo
            ? {
                ...c,
                basicInfo: {
                  ...c.basicInfo,
                  contacts: c.basicInfo.contacts.map((cp) =>
                    cp.id === contactId ? { ...cp, ...patch } : cp,
                  ),
                },
              }
            : c,
        ),
      );
    },
    [],
  );

  const addBasicInfoContact = useCallback((customerId: string) => {
    const newContact = {
      id: `cp-${Date.now()}`,
      name: "",
      furigana: "",
      role: "",
    };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId && c.basicInfo
          ? { ...c, basicInfo: { ...c.basicInfo, contacts: [...c.basicInfo.contacts, newContact] } }
          : c,
      ),
    );
  }, []);

  const deleteBasicInfoContact = useCallback((customerId: string, contactId: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId && c.basicInfo
          ? {
              ...c,
              basicInfo: {
                ...c.basicInfo,
                contacts: c.basicInfo.contacts.filter((cp) => cp.id !== contactId),
              },
            }
          : c,
      ),
    );
  }, []);

  // ===== 基本情報リンク =====

  const updateBasicLink = useCallback(
    (customerId: string, linkId: string, patch: Partial<Pick<CustomerLink, "label" | "url" | "icon">>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                basicLinks: c.basicLinks.map((l) =>
                  l.id === linkId ? { ...l, ...patch } : l,
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  /** トップレベルの新規リンクを末尾に追加する */
  const addBasicLink = useCallback((customerId: string, label: string) => {
    const newLink: CustomerLink = { id: uid("bl"), label, url: "" };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, basicLinks: [...c.basicLinks, newLink] } : c,
      ),
    );
    setSelectedItem({ kind: "basicLink", linkId: newLink.id });
  }, []);

  /** parentId の直後（子の末尾）に新規リンクを挿入する */
  const addBasicLinkAfter = useCallback(
    (customerId: string, parentId: string, label: string) => {
      const newLink: CustomerLink = { id: uid("bl"), label, url: "", parentId };
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          // 同じ parentId を持つ最後の子の直後に挿入
          const links = [...c.basicLinks];
          let insertIdx = links.length;
          for (let i = links.length - 1; i >= 0; i--) {
            if (links[i].parentId === parentId || links[i].id === parentId) {
              insertIdx = i + 1;
              break;
            }
          }
          links.splice(insertIdx, 0, newLink);
          return { ...c, basicLinks: links };
        }),
      );
      setSelectedItem({ kind: "basicLink", linkId: newLink.id });
    },
    [],
  );

  const deleteBasicLink = useCallback(
    (customerId: string, linkId: string) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, basicLinks: c.basicLinks.filter((l) => l.id !== linkId) }
            : c,
        ),
      );
      setSelectedItem((prev) =>
        prev?.kind === "basicLink" && prev.linkId === linkId ? null : prev,
      );
    },
    [],
  );

  // ===== 商談 =====

  const addDeal = useCallback((customerId: string, name: string) => {
    const newDeal: Deal = { id: uid("deal"), name, links: [] };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, deals: [...c.deals, newDeal] } : c,
      ),
    );
  }, []);

  const deleteDeal = useCallback((customerId: string, dealId: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, deals: c.deals.filter((d) => d.id !== dealId) }
          : c,
      ),
    );
    setSelectedItem((prev) =>
      prev?.kind === "dealLink" && prev.dealId === dealId ? null : prev,
    );
  }, []);

  const updateDealName = useCallback(
    (customerId: string, dealId: string, name: string) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, deals: c.deals.map((d) => (d.id === dealId ? { ...d, name } : d)) }
            : c,
        ),
      );
    },
    [],
  );

  // ===== 商談リンク =====

  const addDealLink = useCallback(
    (customerId: string, dealId: string, label: string, url: string, icon?: string, parentId?: string) => {
      const newLink: CustomerLink = {
        id: uid("link"),
        label,
        url,
        ...(icon ? { icon } : {}),
        ...(parentId ? { parentId } : {}),
      };
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                deals: c.deals.map((d) =>
                  d.id === dealId ? { ...d, links: [...d.links, newLink] } : d,
                ),
              }
            : c,
        ),
      );
      // フォルダ自体は選択しない
      if (icon !== "folder") {
        setSelectedItem({ kind: "dealLink", dealId, linkId: newLink.id });
      }
    },
    [],
  );

  const updateDealLink = useCallback(
    (
      customerId: string,
      dealId: string,
      linkId: string,
      patch: Partial<Pick<CustomerLink, "label" | "url" | "icon">>,
    ) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                deals: c.deals.map((d) =>
                  d.id === dealId
                    ? { ...d, links: d.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) }
                    : d,
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  const reorderDealLinks = useCallback(
    (customerId: string, dealId: string, linkIds: string[]) => {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          return {
            ...c,
            deals: c.deals.map((d) => {
              if (d.id !== dealId) return d;
              const linkMap = new Map(d.links.map((l) => [l.id, l]));
              const reordered = linkIds.flatMap((id) => {
                const link = linkMap.get(id);
                return link ? [link] : [];
              });
              return { ...d, links: reordered };
            }),
          };
        }),
      );
    },
    [],
  );

  const moveDealLink = useCallback(
    (customerId: string, dealId: string, linkId: string, parentId: string | null) => {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          return {
            ...c,
            deals: c.deals.map((d) => {
              if (d.id !== dealId) return d;
              return {
                ...d,
                links: d.links.map((l) => {
                  if (l.id !== linkId) return l;
                  if (parentId === null) {
                    const { parentId: _removed, ...rest } = l;
                    return rest;
                  }
                  return { ...l, parentId };
                }),
              };
            }),
          };
        }),
      );
    },
    [],
  );

  const deleteDealLink = useCallback(
    (customerId: string, dealId: string, linkId: string) => {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          return {
            ...c,
            deals: c.deals.map((d) => {
              if (d.id !== dealId) return d;
              const target = d.links.find((l) => l.id === linkId);
              const isFolder = target?.icon === "folder";
              return {
                ...d,
                links: d.links.filter((l) => {
                  if (l.id === linkId) return false;
                  if (isFolder && l.parentId === linkId) return false;
                  return true;
                }),
              };
            }),
          };
        }),
      );
      setSelectedItem((prev) =>
        prev?.kind === "dealLink" && prev.linkId === linkId ? null : prev,
      );
    },
    [],
  );

  // ===== コメント =====

  const addComment = useCallback((customerId: string, text: string) => {
    const currentUser = users.find((u) => u.id === currentUserId);
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      customerId,
      text,
      createdAt: new Date().toISOString(),
      author: currentUser?.name ?? CUSTOMER_PANE_LABELS.defaultAuthor,
      reactions: [],
    };
    setComments((prev) => [...prev, newComment]);
  }, [currentUserId, users]);

  const editComment = useCallback((id: string, text: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, text, editedAt: new Date().toISOString() } : c,
      ),
    );
  }, []);

  const deleteComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reactComment = useCallback((id: string, emoji: string, userName: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const existing = c.reactions.find((r) => r.emoji === emoji);
        let reactions;
        if (existing) {
          const hasUser = existing.users.includes(userName);
          reactions = hasUser
            ? c.reactions
                .map((r) =>
                  r.emoji === emoji
                    ? { ...r, users: r.users.filter((u) => u !== userName) }
                    : r,
                )
                .filter((r) => r.users.length > 0)
            : c.reactions.map((r) =>
                r.emoji === emoji ? { ...r, users: [...r.users, userName] } : r,
              );
        } else {
          reactions = [...c.reactions, { emoji, users: [userName] }];
        }
        return { ...c, reactions };
      }),
    );
  }, []);

  // ===== ユーザー =====

  const saveUsersToServer = useCallback(async (nextUsers: AppUser[]) => {
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextUsers),
      });
    } catch {
      // サーバー保存失敗は無視（localStorage は引き続き機能する）
    }
  }, []);

  const addUser = useCallback((data: Omit<AppUser, "id">) => {
    const newUser: AppUser = { id: `user-${Date.now()}`, ...data };
    setUsers((prev) => {
      const next = [...prev, newUser];
      saveUsersToServer(next);
      return next;
    });
  }, [saveUsersToServer]);

  const editUser = useCallback((id: string, patch: Partial<Omit<AppUser, "id">>) => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === id ? { ...u, ...patch } : u));
      saveUsersToServer(next);
      return next;
    });
  }, [saveUsersToServer]);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      saveUsersToServer(next);
      return next;
    });
  }, [saveUsersToServer]);

  const selectCurrentUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
    setShowUserPicker(false);
    try { localStorage.setItem(CURRENT_USER_KEY, userId); } catch {}
  }, []);

  const switchUser = useCallback(() => {
    setCurrentUserId(null);
    setShowUserPicker(true);
    try { localStorage.removeItem(CURRENT_USER_KEY); } catch {}
  }, []);

  const togglePane4 = useCallback(() => setPane4Open((v) => !v), []);

  const headerLinkLabel =
    selectedItem?.kind === "basicLink"
      ? (activeLink?.label ?? null)
      : selectedItem?.kind === "dealLink"
        ? (activeDeal?.name ?? null)
        : null;

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
      style={{ "--sidebar-width": `${pane1Width}px` } as React.CSSProperties}
    >
      <UserPickerDialog
        open={showUserPicker}
        users={users}
        onSelect={selectCurrentUser}
      />
      <Pane1ResizeHandle
        width={pane1Width}
        onDrag={(d) => setPane1Width((w) => clamp(w + d, 160, 480))}
      />
      <CustomerListPane
        workspaceName={workspace.name}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={selectCustomer}
        onAddCustomer={addCustomer}
        onEditCustomer={editCustomer}
        onDeleteCustomer={deleteCustomer}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          workspaceName={workspace.name}
          customerName={activeCustomer?.name ?? null}
          linkLabel={headerLinkLabel}
          currentUser={currentUser}
          users={users}
          onSwitchUser={switchUser}
          onAddUser={addUser}
          onEditUser={editUser}
          onDeleteUser={deleteUser}
        />
        <div className="flex min-h-0 flex-1">
          {/* Pane2: 企業情報ナビ */}
          <div style={{ width: pane2Width, flexShrink: 0 }} className="min-w-0 flex flex-col">
            <CustomerPane2
              customer={activeCustomer}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onAddDeal={addDeal}
              onDeleteDeal={deleteDeal}
              onAddDealLink={addDealLink}
              onDeleteDealLink={deleteDealLink}
              onRenameDealLink={(customerId, dealId, linkId, label) =>
                updateDealLink(customerId, dealId, linkId, { label })
              }
              onChangeDealLinkIcon={(customerId, dealId, linkId, icon) =>
                updateDealLink(customerId, dealId, linkId, { icon })
              }
              onReorderDealLinks={reorderDealLinks}
              onMoveDealLink={moveDealLink}
            />
          </div>
          <ResizeHandle onDrag={(d) => setPane2Width((w) => clamp(w + d, 160, 480))} />
          {/* Pane3: メインコンテンツ（flex-1） */}
          <DealDetailPane
            customer={activeCustomer}
            selectedItem={selectedItem}
            activeDeal={activeDeal}
            activeLink={activeLink}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
            onUpdateLink={updateDealLink}
            onUpdateBasicLink={updateBasicLink}
            onUpdateBasicInfo={updateBasicInfo}
            onUpdateSmartHRInfo={updateSmartHRInfo}
              onUpdateSlackInfo={updateSlackInfo}
              onUpdateSfdcInfo={updateSfdcInfo}
            onUpdateBasicInfoContact={updateBasicInfoContact}
            onAddBasicInfoContact={addBasicInfoContact}
            onDeleteBasicInfoContact={deleteBasicInfoContact}
            onDeselectItem={() => setSelectedItem(null)}
          />
          <ResizeHandle onDrag={(d) => setPane4Width((w) => clamp(w - d, 200, 600))} />
          {/* Pane4: コメント */}
          <div style={{ width: pane4Width, flexShrink: 0 }} className="min-w-0 flex flex-col">
            <CommentPane
              customerId={selectedCustomerId}
              comments={comments}
              currentUser={currentUser}
              users={users}
              pane4Open={pane4Open}
              onAddComment={addComment}
              onEditComment={editComment}
              onDeleteComment={deleteComment}
              onReactComment={(id, emoji) =>
                reactComment(id, emoji, currentUser?.name ?? CUSTOMER_PANE_LABELS.defaultAuthor)
              }
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
