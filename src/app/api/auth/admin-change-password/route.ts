import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: t(getLocale(), "password_min_length_error") }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    const admin = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!admin?.passwordHash || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      return NextResponse.json({ error: t(getLocale(), "current_password_incorrect_error") }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
