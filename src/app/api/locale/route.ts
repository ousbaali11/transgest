import { NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  const { locale } = await req.json().catch(() => ({}));
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Langue invalide" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 400, // même durée que la session — persiste durablement
    path: "/",
    sameSite: "lax",
  });
  return res;
}
