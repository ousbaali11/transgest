import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

async function assertOwnership(organizationId: string, id: string) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver || driver.organizationId !== organizationId) throw new HttpError(404, "Chauffeur introuvable");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    const driver = await prisma.driver.update({ where: { id: params.id }, data: await req.json() });
    return NextResponse.json(driver);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    await prisma.driver.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
