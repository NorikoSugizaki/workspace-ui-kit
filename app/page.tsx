export const dynamic = "force-dynamic";

import { Workspace } from "@/components/workspace/Workspace";
import commentsData from "@/data/comments.json";
import workspaceData from "@/data/workspace.json";
import {
  customersSchema,
  commentsSchema,
  appUsersSchema,
  workspaceSchema,
  type Customer,
  type AppUser,
} from "@/lib/schema";
import { supabase } from "@/lib/supabase";

async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("furigana");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    furigana: row.furigana,
    basicLinks: row.basic_links ?? [],
    basicInfo: row.basic_info ?? undefined,
    smartHRInfo: row.smarthr_info ?? undefined,
    slackInfo: row.slack_info ?? undefined,
    sfdcInfo: row.sfdc_info ?? undefined,
    deals: row.deals ?? [],
  }));
}

async function fetchUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.slack_name ?? "",
    slackName: row.slack_name ?? "",
    email: row.email ?? undefined,
    avatarDataUrl: row.avatar_data_url ?? undefined,
    isAdmin: row.is_admin ?? false,
  }));
}

export default async function Page() {
  const [customers, users] = await Promise.all([
    fetchCustomers(),
    fetchUsers(),
  ]);

  const custResult = customersSchema.safeParse(customers);
  const commResult = commentsSchema.safeParse(commentsData);
  const usersResult = appUsersSchema.safeParse(
    users.length > 0 ? users : (await import("@/data/users.json")).default
  );
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (!custResult.success || !commResult.success || !usersResult.success || !wsResult.success) {
    const errors = [
      !custResult.success && `customers: ${custResult.error.issues[0]?.message}`,
      !commResult.success && `comments.json: ${commResult.error.issues[0]?.message}`,
      !usersResult.success && `users: ${usersResult.error.issues[0]?.message}`,
      !wsResult.success && `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialCustomers={custResult.data}
      initialComments={commResult.data}
      initialUsers={usersResult.data}
      workspace={wsResult.data}
    />
  );
}
