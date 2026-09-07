import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError, HttpError } from "@/lib/guards";

const bodySchema = z.object({
  organizationId: z.string(),
  locked: z.boolean(),
});

/**
 * Verrouille/déverrouille un compte propriétaire, indépendamment de son
 * abonnement — voir isOrgActive(). Déverrouiller ne réactive PAS un
 * abonnement expiré au passage : ça retire seulement le verrou, l'accès
 * dépend ensuite normalement de l'état d'abonnement en dessous.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
    if (!org) throw new HttpError(404, "Organisation introuvable");

    const updated = await prisma.organization.update({
      where: { id: parsed.data.organizationId },
      data: { lockedByAdmin: parsed.data.locked },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
