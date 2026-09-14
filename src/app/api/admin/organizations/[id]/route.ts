import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { deleteOrganizationCompletely, summarizeOrganization } from "@/lib/delete-organization";

/** Récapitulatif chiffré affiché avant la confirmation de suppression. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    return NextResponse.json(await summarizeOrganization(params.id));
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Suppression complète et définitive d'un compte propriétaire — voir
 * deleteOrganizationCompletely() pour l'ordre exact et les garanties.
 * Réservée à l'admin de la plateforme ; la confirmation par saisie du mot
 * clé est côté interface uniquement, cette route reste la seule barrière
 * réelle et ne fait confiance qu'à la session admin.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const deleted = await deleteOrganizationCompletely(params.id);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    return handleApiError(e);
  }
}
