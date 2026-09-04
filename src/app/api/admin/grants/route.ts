import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { getStripe } from "@/lib/stripe";
import { paypalFetch } from "@/lib/paypal";

const bodySchema = z.object({
  organizationId: z.string(),
  planKey: z.string(),
  durationDays: z.number().nullable(), // null = illimité
});

/**
 * Annule un abonnement Stripe/PayPal encore actif avant d'offrir un accès
 * gratuit — sans ça, le client continuerait à être réellement facturé en
 * plus de son accès offert (double facturation). Échec silencieux et
 * journalisé si le prestataire n'est pas configuré ou déjà résilié : ça ne
 * doit jamais bloquer l'offre de l'abonnement elle-même.
 */
async function cancelExistingPaidSubscription(org: { stripeSubscriptionId: string | null; paypalSubscriptionId: string | null }) {
  if (org.stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(org.stripeSubscriptionId);
    } catch (e) {
      console.error("Échec d'annulation de l'abonnement Stripe existant lors de l'offre admin :", e);
    }
  }
  if (org.paypalSubscriptionId) {
    try {
      await paypalFetch(`/v1/billing/subscriptions/${org.paypalSubscriptionId}/cancel`, {
        method: "POST",
        body: { reason: "Accès offert par l'administrateur" },
      });
    } catch (e) {
      console.error("Échec d'annulation de l'abonnement PayPal existant lors de l'offre admin :", e);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const { organizationId, planKey, durationDays } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) return NextResponse.json({ error: "Formule introuvable" }, { status: 404 });

    const existingOrg = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!existingOrg) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
    if (existingOrg.stripeSubscriptionId || existingOrg.paypalSubscriptionId) {
      await cancelExistingPaidSubscription(existingOrg);
    }

    const currentPeriodEnd = durationDays
      ? new Date(Date.now() + durationDays * 86_400_000)
      : null;

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        planId: plan.id,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        grantedByAdmin: true,
        stripeSubscriptionId: null,
        paypalSubscriptionId: null,
        paymentProvider: null,
      },
    });
    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: "organizationId manquant" }, { status: 400 });

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: "NONE", grantedByAdmin: false, currentPeriodEnd: null, planId: null },
    });
    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}
