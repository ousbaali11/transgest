import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError, HttpError } from "@/lib/guards";
import { getPlatformSettings } from "@/lib/settings";
import { sendLoginCodeEmail } from "@/lib/email";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({
  purpose: z.enum(["VIEW_SUBSCRIPTIONS", "CHANGE_CONTACT_EMAIL"]),
});

function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Envoie un code de vérification à l'email de CONTACT configuré (jamais à
 * un email fourni dans la requête) — c'est justement ce qui empêche de
 * changer l'email de contact sans prouver qu'on contrôle encore l'ancien.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(getLocale(), "invalid_request_error") }, { status: 400 });

    const settings = await getPlatformSettings();
    if (!settings.contactEmail) {
      throw new HttpError(400, t(getLocale(), "no_contact_email_error"));
    }

    const code = genCode();
    const codeHash = await bcrypt.hash(code, 10);
    await sendLoginCodeEmail(settings.contactEmail, code, settings.appName);
    await prisma.adminActionCode.create({
      data: { purpose: parsed.data.purpose, codeHash, expiresAt: new Date(Date.now() + 10 * 60_000) },
    });

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok: true, devCode: isDev ? code : undefined });
  } catch (e) {
    return handleApiError(e);
  }
}
