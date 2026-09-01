import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(4),
  countryCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const { phone, code, countryCode } = parsed.data;

    const otp = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code expiré, demandez-en un nouveau." }, { status: 400 });
    }
    if (otp.attempts >= 5) {
      return NextResponse.json({ error: "Trop de tentatives, demandez un nouveau code." }, { status: 429 });
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
    }

    // Code valide : on le supprime pour empêcher toute réutilisation.
    await prisma.otpCode.delete({ where: { id: otp.id } });

    let user = await prisma.user.findUnique({ where: { phone }, include: { organization: true } });

    if (!user) {
      // Première connexion avec ce numéro : on crée l'organisation (l'entreprise
      // du propriétaire) et son compte utilisateur.
      const org = await prisma.organization.create({
        data: { name: "Mon entreprise", countryCode: countryCode || null },
      });
      user = await prisma.user.create({
        data: { phone, role: "OWNER", organizationId: org.id },
        include: { organization: true },
      });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: "Compte sans organisation associée" }, { status: 500 });
    }

    const token = await signSession({
      role: user.role === "DRIVER" ? "DRIVER" : "OWNER",
      userId: user.id,
      organizationId: user.organizationId,
      phone: user.phone!,
    });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
