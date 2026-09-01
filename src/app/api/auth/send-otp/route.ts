import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOtpSms } from "@/lib/sms";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
});

const IP_MAX_REQUESTS = 5;
const IP_WINDOW_MS = 15 * 60_000; // 15 minutes

function genOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Vercel (et la plupart des proxys) transmettent l'IP réelle du visiteur via cet en-tête. */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }
    const { phone } = parsed.data;
    const ip = getClientIp(req);

    // Anti-spam n°1 : pas plus d'une demande toutes les 30s pour un même numéro.
    const recent = await prisma.otpCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 30_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return NextResponse.json({ error: "Un code a déjà été envoyé, patientez quelques secondes." }, { status: 429 });
    }

    // Anti-spam n°2 : une même adresse IP ne peut pas demander plus de
    // IP_MAX_REQUESTS codes (vers n'importe quel numéro) en IP_WINDOW_MS.
    if (ip !== "unknown") {
      const countFromIp = await prisma.otpCode.count({
        where: { ip, createdAt: { gt: new Date(Date.now() - IP_WINDOW_MS) } },
      });
      if (countFromIp >= IP_MAX_REQUESTS) {
        return NextResponse.json({ error: "Trop de demandes depuis cette connexion. Réessayez plus tard." }, { status: 429 });
      }
    }

    const code = genOtp();
    const codeHash = await bcrypt.hash(code, 10);
    await prisma.otpCode.create({
      data: { phone, codeHash, expiresAt: new Date(Date.now() + 5 * 60_000), ip },
    });

    // L'envoi SMS est isolé dans son propre try/catch : si Twilio refuse
    // (numéro non vérifié en compte d'essai, identifiants invalides...), on
    // renvoie une erreur JSON claire plutôt que de laisser planter toute la
    // requête (ce qui provoquait un échec silencieux côté navigateur).
    try {
      await sendOtpSms(phone, code);
    } catch (smsError) {
      console.error("Échec d'envoi SMS :", smsError);
      return NextResponse.json(
        { error: "Impossible d'envoyer le SMS. Vérifiez vos identifiants Twilio, ou que ce numéro est bien vérifié dans votre compte d'essai." },
        { status: 502 }
      );
    }

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok: true, devCode: isDev ? code : undefined });
  } catch (e) {
    return handleApiError(e);
  }
}
