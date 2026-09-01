import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/guards";

export async function POST() {
  try {
    clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
