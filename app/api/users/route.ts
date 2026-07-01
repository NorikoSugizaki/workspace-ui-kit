import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { appUsersSchema } from "@/lib/schema";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

export async function GET() {
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  return NextResponse.json(JSON.parse(raw));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = appUsersSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(result.data, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
