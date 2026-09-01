import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import type { SessionPayload } from "@/lib/session";

async function assertAccess(session: Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.organizationId !== session.organizationId) throw new HttpError(404, "Dépense introuvable");
  if (session.role === "DRIVER" && expense.driverId !== session.driverId) {
    throw new HttpError(403, "Vous ne pouvez modifier que vos propres dépenses.");
  }
  return expense;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertAccess(session, params.id);
    const body = await req.json();
    if (body.date) body.date = new Date(body.date);
    if (session.role === "DRIVER") body.driverId = session.driverId;
    const expense = await prisma.expense.update({ where: { id: params.id }, data: body });
    return NextResponse.json(expense);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertAccess(session, params.id);
    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
