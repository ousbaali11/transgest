import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { generateAccessCode } from "@/lib/access-code";

/** Génère un nouveau code de connexion pour ce chauffeur (invalide l'ancien immédiatement). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    const driver = await prisma.driver.findUnique({ where: { id: params.id } });
    if (!driver || driver.organizationId !== session.organizationId) throw new HttpError(404, "Chauffeur introuvable");
    if (driver.isOwnerSelf) throw new HttpError(400, "Ce profil n'a pas de code de connexion (c'est vous, le propriétaire).");

    const updated = await prisma.driver.update({ where: { id: params.id }, data: { accessCode: generateAccessCode() } });
    return NextResponse.json({ accessCode: updated.accessCode });
  } catch (e) {
    return handleApiError(e);
  }
}
