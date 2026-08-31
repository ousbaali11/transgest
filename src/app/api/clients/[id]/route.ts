import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

async function assertOwnership(organizationId: string, id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.organizationId !== organizationId) throw new HttpError(404, "Client introuvable");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    const client = await prisma.client.update({ where: { id: params.id }, data: await req.json() });
    return NextResponse.json(client);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    await prisma.client.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
