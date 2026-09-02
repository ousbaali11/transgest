import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import type { SessionPayload } from "@/lib/session";

/**
 * Vérifie que le voyage appartient à l'organisation, et — pour un chauffeur —
 * qu'il s'agit bien d'un voyage qu'IL A LUI-MÊME saisi (pas seulement un
 * voyage qui lui est attribué : ce que le propriétaire a saisi pour lui
 * reste en lecture seule pour le chauffeur). Le propriétaire peut toujours
 * tout modifier/supprimer.
 */
async function assertAccess(session: Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>, id: string) {
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.organizationId !== session.organizationId) throw new HttpError(404, "Voyage introuvable");
  if (session.role === "DRIVER" && trip.createdByUserId !== session.userId) {
    throw new HttpError(403, "Vous ne pouvez modifier que les voyages que vous avez vous-même saisis.");
  }
  return trip;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertAccess(session, params.id);
    const body = await req.json();
    if (body.date) body.date = new Date(body.date);
    // Un chauffeur ne peut pas réattribuer un voyage à quelqu'un d'autre.
    if (session.role === "DRIVER") body.driverId = session.driverId;
    const trip = await prisma.trip.update({ where: { id: params.id }, data: body });
    return NextResponse.json(trip);
  } catch (e) {
    return handleApiError(e);
  }
}

// Supprimer un voyage supprime aussi ses dépenses liées et sa facture (onDelete: Cascade côté schéma).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertAccess(session, params.id);
    await prisma.trip.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
