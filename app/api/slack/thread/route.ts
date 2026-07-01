import { NextResponse } from "next/server";
import mockData from "@/data/slack-thread-mock.json";

export async function GET() {
  return NextResponse.json(mockData);
}
