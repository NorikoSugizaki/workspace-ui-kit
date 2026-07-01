import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appUsersSchema } from "@/lib/schema";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
  const { data, error } = await supabase.from("users").select("*");
  if (error || !data) return NextResponse.json([]);
  return NextResponse.json(
    data.map((row) => ({
      id: row.id,
      name: row.name ?? row.slack_name ?? "",
      slackName: row.slack_name ?? "",
      email: row.email ?? undefined,
      avatarDataUrl: row.avatar_data_url ?? undefined,
      isAdmin: row.is_admin ?? false,
    })),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = appUsersSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  }
  const rows = result.data.map((u) => ({
    id: u.id,
    name: u.slackName || u.name || "",
    slack_name: u.slackName,
    email: u.email ?? null,
    avatar_data_url: u.avatarDataUrl ?? null,
    is_admin: u.isAdmin,
  }));
  const { error } = await supabase.from("users").upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
