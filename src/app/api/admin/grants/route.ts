import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { cancelProviderSubscriptionNow, hasProviderSubscription } from "@/lib/subscription-provider";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({
  organizationId: z.string(),
  planKey: z.string(),
  durationDays: z.number().int().positive().nullable(), // null = illimité
});

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const locale = getLocale();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(locale, "invalid_request_error") }, { status: 400 });
    const { organizationId, planKey, durationDays } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) return NextResponse.json({ error: t(locale, "plan_not_found_error") }, { status: 404 });

    const existingOrg = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!existingOrg) return NextResponse.json({ error: t(locale, "org_not_found_error") }, { status: 404 });
    // Annule un abonnement Stripe/PayPal encore actif avant d'offrir un
    // accès gratuit — sans ça, le client continuerait à être réellement
    // facturé en plus de son accès offert (double facturation).
    if (hasProviderSubscription(existingOrg)) {
      await cancelProviderSubscriptionNow(existingOrg);
    }

    const currentPeriodEnd = durationDays
      ? new Date(Date.now() + durationDays * 86_400_000)
      : null;

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        planId: plan.id,
        billingInterval: null,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        grantedByAdmin: true,
        // Offrir un abonnement est une décision explicite de l'admin de
        // redonner l'accès — sans lever le verrou ici, le compte restait
        // bloqué malgré l'offre, ce qui rendait l'action silencieusement
        // inutile pour un compte verrouillé.
        lockedByAdmin: false,
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
    const locale = getLocale();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: t(locale, "missing_id_error") }, { status: 400 });

    // Retirer une offre n'a de sens que si une offre existe : appelée
    // directement sur un compte qui PAIE réellement son abonnement, cette
    // route coupait son accès (statut NONE) alors que Stripe/PayPal
    // continuait à le facturer.
    const existing = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!existing) return NextResponse.json({ error: t(locale, "org_not_found_error") }, { status: 404 });
    if (!existing.grantedByAdmin) return NextResponse.json({ error: t(locale, "grant_not_found_error") }, { status: 400 });

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionStatus: "NONE", grantedByAdmin: false, currentPeriodEnd: null, planId: null,
        billingInterval: null, cancelAtPeriodEnd: false, canceledAt: null,
      },
    });
    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}
