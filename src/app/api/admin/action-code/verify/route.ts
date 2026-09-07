import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  purpose: z.enum(["VIEW_SUBSCRIPTIONS", "CHANGE_CONTACT_EMAIL"]),
  code: z.string().length(4),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    const { purpose, code } = parsed.data;

    const action = await prisma.adminActionCode.findFirst({
      where: { purpose },
      orderBy: { createdAt: "desc" },
    });

    if (!action || action.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code expiré, redemandez-en un nouveau." }, { status: 400 });
    }
    if (action.attempts >= 5) {
      return NextResponse.json({ error: "Trop de tentatives, redemandez un nouveau code." }, { status: 429 });
    }

    const valid = await bcrypt.compare(code, action.codeHash);
    if (!valid) {
      await prisma.adminActionCode.update({ where: { id: action.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
    }

    // À usage unique.
    await prisma.adminActionCode.delete({ where: { id: action.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
