import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import type { SessionPayload } from "@/lib/session";
import { createSchema } from "../route";

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
    await assertOrgActive(session.organizationId);
    await assertAccess(session, params.id);
    // Liste blanche stricte : sans elle, un chauffeur pourrait par exemple
    // envoyer createdByUserId pour s'attribuer un voyage saisi par le
    // propriétaire et contourner la restriction ci-dessus, ou organizationId
    // pour déplacer le voyage vers une autre organisation.
    const parsed = createSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const data: Omit<typeof parsed.data, "date"> & { date?: Date } = { ...parsed.data, date: undefined };
    if (parsed.data.date) data.date = new Date(parsed.data.date);
    if (session.role === "DRIVER") data.driverId = session.driverId;
    const trip = await prisma.trip.update({ where: { id: params.id }, data });
    return NextResponse.json(trip);
  } catch (e) {
    return handleApiError(e);
  }
}

// Supprimer un voyage supprime aussi ses dépenses liées et sa facture (onDelete: Cascade côté schéma).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session.organizationId);
    await assertAccess(session, params.id);
    await prisma.trip.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
