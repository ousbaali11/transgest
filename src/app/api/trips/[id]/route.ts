import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

async function assertOwnership(organizationId: string, id: string) {
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.organizationId !== organizationId) throw new HttpError(404, "Voyage introuvable");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    const body = await req.json();
    if (body.date) body.date = new Date(body.date);
    const trip = await prisma.trip.update({ where: { id: params.id }, data: body });
    return NextResponse.json(trip);
  } catch (e) {
    return handleApiError(e);
  }
}

// Supprimer un voyage supprime aussi ses dépenses liées et sa facture (onDelete: Cascade côté schéma).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireOrgSession();
    await assertOwnership(session.organizationId, params.id);
    await prisma.trip.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
