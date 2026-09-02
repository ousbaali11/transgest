import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendLoginCodeEmail } from "@/lib/email";
import { handleApiError } from "@/lib/guards";
import { getPlatformSettings } from "@/lib/settings";

const bodySchema = z.object({
  email: z.string().email(),
});

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

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const ip = getClientIp(req);

    const recent = await prisma.emailCode.findFirst({
      where: { email, createdAt: { gt: new Date(Date.now() - 30_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return NextResponse.json(
        { error: "Un code a déjà été envoyé, patientez quelques secondes.", code: "ALREADY_SENT" },
        { status: 429 }
      );
    }

    if (ip !== "unknown") {
      const countFromIp = await prisma.emailCode.count({
        where: { ip, createdAt: { gt: new Date(Date.now() - IP_WINDOW_MS) } },
      });
      if (countFromIp >= IP_MAX_REQUESTS) {
        return NextResponse.json({ error: "Trop de demandes depuis cette connexion. Réessayez plus tard." }, { status: 429 });
      }
    }

    const code = genCode();
    const codeHash = await bcrypt.hash(code, 10);

    try {
      const settings = await getPlatformSettings();
      await sendLoginCodeEmail(email, code, settings.appName);
    } catch (emailError) {
      console.error("Échec d'envoi email :", emailError);
      const isDevError = process.env.NODE_ENV !== "production";
      const detail = emailError instanceof Error ? emailError.message : String(emailError);
      return NextResponse.json(
        { error: isDevError ? `Échec d'envoi email : ${detail}` : "Impossible d'envoyer l'email. Réessayez dans quelques instants ou contactez le support." },
        { status: 502 }
      );
    }

    await prisma.emailCode.create({
      data: { email, codeHash, expiresAt: new Date(Date.now() + 5 * 60_000), ip },
    });

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok: true, devCode: isDev ? code : undefined });
  } catch (e) {
    return handleApiError(e);
  }
}
