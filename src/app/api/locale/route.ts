import { NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE, t } from "@/lib/i18n";
import { getLocale } from "@/lib/get-locale";

export async function POST(req: NextRequest) {
  const { locale } = await req.json().catch(() => ({}));
  if (!isLocale(locale)) {
    return NextResponse.json({ error: t(getLocale(), "invalid_locale_error") }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 400, // même durée que la session — persiste durablement
    path: "/",
    sameSite: "lax",
  });
  return res;
}
