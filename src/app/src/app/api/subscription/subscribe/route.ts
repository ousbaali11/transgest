import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";

const bodySchema = z.object({ planKey: z.string() });

/**
 * Active directement une formule GRATUITE pour l'organisation courante.
 * Réservé aux formules à 0 MAD : toute formule payante doit obligatoirement
 * passer par un vrai paiement (Stripe ou PayPal — voir
 * /api/subscription/checkout/*), jamais par cette route, pour ne jamais
 * activer un accès payant sans paiement confirmé.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const plan = await prisma.plan.findUnique({ where: { key: parsed.data.planKey } });
    if (!plan) throw new HttpError(404, "Formule introuvable");
    if (plan.priceMAD > 0) {
      throw new HttpError(400, "Cette formule est payante — utilisez le paiement par carte ou PayPal.");
    }

    const org = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        planId: plan.id,
        billingInterval: null,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        grantedByAdmin: false,
        paymentProvider: null,
      },
    });

    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}
