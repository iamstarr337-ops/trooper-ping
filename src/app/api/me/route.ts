import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const { session, subscribed } = getSessionFromCookies();
  return NextResponse.json({
    subscribed,
    customerId: session?.customerId ?? null,
    email: session?.email ?? null,
    status: session?.status ?? "none",
  });
}
