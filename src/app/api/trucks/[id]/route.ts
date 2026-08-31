import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

async function assertOwnership(organizationId: string, id: string) {
  const truck = await prisma.truck.findUnique({ where: { id } });
  if (!truck || truck.organizationId !== organizationId) {
    throw new HttpError(404, "Camion introuvable");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    const body = await req.json();
    const truck = await prisma.truck.update({ where: { id: params.id }, data: body });
    return NextResponse.json(truck);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    await prisma.truck.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
