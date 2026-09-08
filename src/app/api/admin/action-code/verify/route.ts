import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({
  purpose: z.enum(["VIEW_SUBSCRIPTIONS", "CHANGE_CONTACT_EMAIL"]),
  code: z.string().length(4),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(getLocale(), "invalid_request_error") }, { status: 400 });
    const { purpose, code } = parsed.data;

    const action = await prisma.adminActionCode.findFirst({
      where: { purpose },
      orderBy: { createdAt: "desc" },
    });

    if (!action || action.expiresAt < new Date()) {
      return NextResponse.json({ error: t(getLocale(), "code_expired_error") }, { status: 400 });
    }
    if (action.attempts >= 5) {
      return NextResponse.json({ error: t(getLocale(), "too_many_attempts_error") }, { status: 429 });
    }

    const valid = await bcrypt.compare(code, action.codeHash);
    if (!valid) {
      await prisma.adminActionCode.update({ where: { id: action.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: t(getLocale(), "incorrect_code_error") }, { status: 400 });
    }

    // Marque la vérification comme valable pour les 15 prochaines minutes —
    // c'est ce délai que les routes protégées vérifient ensuite (voir
    // assertActionVerified dans lib/admin-action.ts). On ne supprime plus
    // la ligne immédiatement : elle doit persister le temps de cette
    // fenêtre pour que la protection serveur ait quelque chose à contrôler.
    await prisma.adminActionCode.update({
      where: { id: action.id },
      data: { verifiedUntil: new Date(Date.now() + 15 * 60_000) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
