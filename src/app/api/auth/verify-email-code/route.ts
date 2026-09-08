import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(4),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: t(getLocale(), "invalid_request_error") }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const { code } = parsed.data;

    const otp = await prisma.emailCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      return NextResponse.json({ error: t(getLocale(), "code_expired_error") }, { status: 400 });
    }
    if (otp.attempts >= 5) {
      return NextResponse.json({ error: t(getLocale(), "too_many_attempts_error") }, { status: 429 });
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      await prisma.emailCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: t(getLocale(), "incorrect_code_error") }, { status: 400 });
    }

    // Ces deux opérations sont indépendantes (supprimer le code utilisé,
    // chercher l'utilisateur) — les lancer en parallèle plutôt qu'à la
    // suite économise un aller-retour réseau vers la base de données à
    // chaque connexion.
    const [, user0] = await Promise.all([
      prisma.emailCode.delete({ where: { id: otp.id } }),
      prisma.user.findUnique({ where: { email } }),
    ]);
    let user = user0;

    if (!user) {
      // Première connexion avec cet email : nouveau propriétaire, on crée son
      // organisation. (Si un chauffeur existant avait cet email... les
      // chauffeurs n'ont pas d'email de connexion, donc pas de conflit possible.)
      //
      // Accès gratuit et illimité dès la création — pas d'écran d'abonnement
      // à l'inscription. C'est l'admin qui décide au cas par cas, plus tard,
      // de verrouiller un compte pour le faire passer à l'offre payante
      // (voir isOrgActive() et /api/admin/lock).
      const freePlan = await prisma.plan.findUnique({ where: { key: "free" } });
      const org = await prisma.organization.create({
        data: {
          name: t(getLocale(), "default_org_name"),
          planId: freePlan?.id,
          subscriptionStatus: "ACTIVE",
          currentPeriodEnd: null,
        },
      });
      user = await prisma.user.create({ data: { email, role: "OWNER", organizationId: org.id } });
    }

    if (user.role !== "OWNER" || !user.organizationId) {
      return NextResponse.json({ error: t(getLocale(), "not_owner_account_error") }, { status: 403 });
    }

    const token = await signSession({ role: "OWNER", userId: user.id, organizationId: user.organizationId, email });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
