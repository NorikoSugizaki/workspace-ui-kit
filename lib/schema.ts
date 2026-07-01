/**
 * 顧客情報管理ドメインの Zod スキーマと派生型。
 * UI コンポーネントはここから型をインポートする。
 */

import { z } from "zod";

// ===== SmartHRInfo: SmartHR 情報 =====

export const smartHRInfoSchema = z.object({
  tier: z.string(),
  shrIntroduction: z.string(),
  consultingContract: z.string(),
  salesRecord: z.string(),
  /** 自社セールス担当者の Slack ネーム一覧 */
  sales: z.union([z.string(), z.array(z.string())])
    .transform((v) => (typeof v === "string" ? (v ? [v] : []) : v))
    .default([]),
  /** 自社 CS 担当者の Slack ネーム一覧 */
  cs: z.union([z.string(), z.array(z.string())])
    .transform((v) => (typeof v === "string" ? (v ? [v] : []) : v))
    .default([]),
  /** 自社コンサル担当者の Slack ネーム一覧 */
  consultants: z.array(z.string()).default([]),
});
export type SmartHRInfo = z.infer<typeof smartHRInfoSchema>;

// ===== ContactPerson: 顧客の担当者 =====

export const contactPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  furigana: z.string(),
  affiliation: z.string().optional(),
  role: z.string(),
  imageDataUrl: z.string().optional(),
});
export type ContactPerson = z.infer<typeof contactPersonSchema>;

// ===== CustomerBasicInfo: 顧客の基本情報（構造化フォーム） =====

export const customerBasicInfoSchema = z.object({
  companyName: z.string(),
  address: z.string(),
  department: z.string().optional(),
  url: z.string(),
  contacts: z.array(contactPersonSchema),
});
export type CustomerBasicInfo = z.infer<typeof customerBasicInfoSchema>;

// ===== SlackInfo: Slack チャンネル情報 =====

export const slackInfoSchema = z.object({
  /** 外部共有チャンネルの URL */
  channelUrl: z.string().default(""),
  /** チャンネル名（例: #ext-aqua-shojai） */
  channelName: z.string().default(""),
  /** 招待ステータス */
  inviteStatus: z.string().default(""),
  /** メモ */
  note: z.string().default(""),
});
export type SlackInfo = z.infer<typeof slackInfoSchema>;

// ===== SfdcInfo: Salesforce 情報 =====

export const sfdcInfoSchema = z.object({
  /** Salesforce の URL */
  url: z.string().default(""),
});
export type SfdcInfo = z.infer<typeof sfdcInfoSchema>;

// ===== CustomerLink: 商談に紐づくリンク =====

export const customerLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  /** 設定されている場合、このリンクは親リンクの子エントリー */
  parentId: z.string().optional(),
  /** true の場合はデフォルトリンク（リネーム・削除不可） */
  isDefault: z.boolean().optional(),
  /** アイコン種別: "powerpoint" | "chrome" | "word" | "link" */
  icon: z.string().optional(),
});
export type CustomerLink = z.infer<typeof customerLinkSchema>;

// ===== Deal: 商談（リンクをまとめる単位） =====

export const dealSchema = z.object({
  id: z.string(),
  name: z.string(),
  links: z.array(customerLinkSchema),
});
export type Deal = z.infer<typeof dealSchema>;

// ===== Customer: 顧客 =====

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** ひらがな。あいうえお順ソート・かな行グループ化に使う */
  furigana: z.string(),
  /** 顧客共通の基本リンク（企業情報・Slack・SFDC 等） */
  basicLinks: z.array(customerLinkSchema).default([]),
  /** 基本情報ペインに表示する構造化データ */
  basicInfo: customerBasicInfoSchema.optional(),
  /** SmartHR 情報 */
  smartHRInfo: smartHRInfoSchema.optional(),
  /** Slack チャンネル情報 */
  slackInfo: slackInfoSchema.optional(),
  /** Salesforce 情報 */
  sfdcInfo: sfdcInfoSchema.optional(),
  deals: z.array(dealSchema),
});
export type Customer = z.infer<typeof customerSchema>;

/** Pane2 で何を選択しているかを表す union 型 */
export type SelectedItem =
  | { kind: "basicLink"; linkId: string }
  | { kind: "dealLink"; dealId: string; linkId: string }
  | null;

// ===== Comment: メモ・コメント =====

export const commentReactionSchema = z.object({
  emoji: z.string(),
  /** リアクションしたユーザー名の一覧 */
  users: z.array(z.string()),
});
export type CommentReaction = z.infer<typeof commentReactionSchema>;

export const commentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  text: z.string(),
  createdAt: z.string(),
  author: z.string(),
  editedAt: z.string().optional(),
  reactions: z.array(commentReactionSchema).default([]),
});
export type Comment = z.infer<typeof commentSchema>;

// ===== AppUser: アプリユーザー =====

export const appUserSchema = z.object({
  id: z.string(),
  /** 表示名（未設定時は slackName を使用） */
  name: z.string().optional().default(""),
  /** Slack 表示名（@ なし） */
  slackName: z.string().default(""),
  /** メールアドレス */
  email: z.string().optional(),
  /** アバター画像（base64 data URL または https URL） */
  avatarDataUrl: z.string().optional(),
  /** 管理者フラグ */
  isAdmin: z.boolean().default(false),
});
export type AppUser = z.infer<typeof appUserSchema>;
export const appUsersSchema = z.array(appUserSchema);

// ===== Workspace 設定 =====

export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});
export type WorkspaceConfig = z.infer<typeof workspaceSchema>;

// ===== コレクションスキーマ =====

export const customersSchema = z.array(customerSchema);
export const commentsSchema = z.array(commentSchema);

// ===== かな行グループ化ユーティリティ =====

export const KANA_ROWS = [
  { label: "あ行", chars: "あいうえおぁぃぅぇぉ" },
  { label: "か行", chars: "かきくけこがぎぐげごゕゖ" },
  { label: "さ行", chars: "さしすせそざじずぜぞ" },
  { label: "た行", chars: "たちつてとだぢづでどっ" },
  { label: "な行", chars: "なにぬねの" },
  { label: "は行", chars: "はひふへほばびぶべぼぱぴぷぺぽ" },
  { label: "ま行", chars: "まみむめも" },
  { label: "や行", chars: "やゆよゃゅょ" },
  { label: "ら行", chars: "らりるれろ" },
  { label: "わ行", chars: "わゐゑをんゎ" },
] as const;

export function getKanaRowLabel(furigana: string): string {
  const first = furigana[0] ?? "";
  for (const row of KANA_ROWS) {
    if (row.chars.includes(first)) return row.label;
  }
  return "その他";
}
