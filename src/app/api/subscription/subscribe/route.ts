import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";

const bodySchema = z.object({ planKey: z.string() });

/**
 * Active un abonnement pour l'organisation courante.
 *
 * NOTE PAIEMENT : cette route active l'abonnement immédiatement, comme le
 * faisait le prototype (paiement simulé). En production, ne l'appelez
 * qu'après confirmation du paiement — par exemple depuis le webhook de votre
 * passerelle (CMI, PayZone, ChariBaaS...) une fois la transaction validée,
 * pas directement depuis le clic du bouton côté client.
 */
export async function POST(req: NextRequest) {
  try {
    const session = requireOrgSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const plan = await prisma.plan.findUnique({ where: { key: parsed.data.planKey } });
    if (!plan) return NextResponse.json({ error: "Formule introuvable" }, { status: 404 });

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    const org = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        planId: plan.id,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        grantedByAdmin: false,
      },
    });

    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}
