import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";

export async function POST() {
  try {
    const session = await requireOwnerSession();
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    // Garde-fou critique : sans cette vérification, n'importe quel compte
    // authentifié pourrait appeler cette route directement (hors de tout
    // bouton) et obtenir un accès actif illimité sans jamais avoir payé.
    // Réactiver n'a de sens que pour ANNULER une résiliation déjà en cours.
    if (!org || !org.cancelAtPeriodEnd) {
      throw new HttpError(400, "Aucune résiliation en cours à annuler.");
    }
    const updated = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { cancelAtPeriodEnd: false, canceledAt: null, subscriptionStatus: "ACTIVE" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
