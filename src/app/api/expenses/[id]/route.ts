import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

async function assertOwnership(organizationId: string, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.organizationId !== organizationId) throw new HttpError(404, "Dépense introuvable");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    const body = await req.json();
    if (body.date) body.date = new Date(body.date);
    const expense = await prisma.expense.update({ where: { id: params.id }, data: body });
    return NextResponse.json(expense);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
