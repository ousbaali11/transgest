import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendLoginCodeEmail } from "@/lib/email";
import { handleApiError } from "@/lib/guards";
import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({ email: z.string().email() });

const IP_MAX_REQUESTS = 5;
const IP_WINDOW_MS = 15 * 60_000;

function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Demande un code de réinitialisation du mot de passe admin. Ne révèle
 * jamais si l'email correspond ou non à un compte admin (même réponse
 * "ok" dans les deux cas) — évite qu'un visiteur puisse deviner par
 * élimination quelle adresse est celle de l'administrateur.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: t(getLocale(), "invalid_email_error") }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const ip = getClientIp(req);

    // Même délai minimal entre deux codes pour une même adresse que pour la
    // connexion propriétaire : sans lui, la boîte de l'admin pouvait être
    // inondée de codes (5 par IP et par quart d'heure, sans limite par email).
    const recent = await prisma.adminResetCode.findFirst({
      where: { email, createdAt: { gt: new Date(Date.now() - 30_000) } },
    });
    if (recent) {
      return NextResponse.json({ error: t(getLocale(), "code_already_sent_error") }, { status: 429 });
    }

    if (ip !== "unknown") {
      const countFromIp = await prisma.adminResetCode.count({
        where: { ip, createdAt: { gt: new Date(Date.now() - IP_WINDOW_MS) } },
      });
      if (countFromIp >= IP_MAX_REQUESTS) {
        return NextResponse.json({ error: t(getLocale(), "too_many_requests_ip_error") }, { status: 429 });
      }
    }

    const admin = await prisma.user.findFirst({ where: { role: "PLATFORM_ADMIN", email } });
    const isDev = process.env.NODE_ENV !== "production";
    let devCode: string | undefined;

    if (admin) {
      const code = genCode();
      const codeHash = await bcrypt.hash(code, 10);
      try {
        const settings = await getPlatformSettings();
        await sendLoginCodeEmail(email, code, settings.appName);
        await prisma.adminResetCode.create({
          data: { email, codeHash, expiresAt: new Date(Date.now() + 15 * 60_000), ip },
        });
        if (isDev) devCode = code;
      } catch (emailError) {
        console.error("Échec d'envoi email (réinitialisation admin) :", emailError);
        // Toujours répondre "ok" même en cas d'échec d'envoi : ne pas
        // confirmer/infirmer l'existence du compte via le comportement de
        // la réponse.
      }
    }

    return NextResponse.json({ ok: true, devCode });
  } catch (e) {
    return handleApiError(e);
  }
}
