import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(4),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const { code, newPassword } = parsed.data;

    const reset = await prisma.adminResetCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!reset || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code expiré, redemandez-en un nouveau." }, { status: 400 });
    }
    if (reset.attempts >= 5) {
      return NextResponse.json({ error: "Trop de tentatives, redemandez un nouveau code." }, { status: 429 });
    }

    // La vérification du code et la recherche du compte admin sont
    // indépendantes — les lancer en parallèle économise un aller-retour.
    const [valid, admin] = await Promise.all([
      bcrypt.compare(code, reset.codeHash),
      prisma.user.findFirst({ where: { role: "PLATFORM_ADMIN", email } }),
    ]);
    if (!valid) {
      await prisma.adminResetCode.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
    }
    if (!admin) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // À usage unique : supprime le code pour empêcher toute réutilisation.
    // Indépendant de la mise à jour du mot de passe — en parallèle aussi.
    await Promise.all([
      prisma.user.update({ where: { id: admin.id }, data: { passwordHash } }),
      prisma.adminResetCode.delete({ where: { id: reset.id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
