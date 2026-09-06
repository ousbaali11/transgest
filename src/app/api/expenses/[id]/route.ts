import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import type { SessionPayload } from "@/lib/session";
import { createSchema } from "../route";

async function assertAccess(session: Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.organizationId !== session.organizationId) throw new HttpError(404, "Dépense introuvable");
  if (session.role === "DRIVER" && expense.createdByUserId !== session.userId) {
    throw new HttpError(403, "Vous ne pouvez modifier que les dépenses que vous avez vous-même saisies.");
  }
  return expense;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session.organizationId);
    await assertAccess(session, params.id);
    const parsed = createSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const data: Omit<typeof parsed.data, "date"> & { date?: Date } = { ...parsed.data, date: undefined };
    if (parsed.data.date) data.date = new Date(parsed.data.date);
    if (session.role === "DRIVER") data.driverId = session.driverId;
    const expense = await prisma.expense.update({ where: { id: params.id }, data });
    return NextResponse.json(expense);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session.organizationId);
    await assertAccess(session, params.id);
    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
