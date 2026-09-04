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
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const { code } = parsed.data;

    const otp = await prisma.emailCode.findFirst({
      where: { email },
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
      await prisma.emailCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
    }

    await prisma.emailCode.delete({ where: { id: otp.id } });

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Première connexion avec cet email : nouveau propriétaire, on crée son
      // organisation. (Si un chauffeur existant avait cet email... les
      // chauffeurs n'ont pas d'email de connexion, donc pas de conflit possible.)
      const org = await prisma.organization.create({ data: { name: t(getLocale(), "default_org_name") } });
      user = await prisma.user.create({ data: { email, role: "OWNER", organizationId: org.id } });
    }

    if (user.role !== "OWNER" || !user.organizationId) {
      return NextResponse.json({ error: "Ce compte n'est pas un compte propriétaire." }, { status: 403 });
    }

    const token = await signSession({ role: "OWNER", userId: user.id, organizationId: user.organizationId, email });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
