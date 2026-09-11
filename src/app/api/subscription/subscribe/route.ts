import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { getPlatformSettings } from "@/lib/settings";
import { cancelProviderSubscriptionNow, hasProviderSubscription } from "@/lib/subscription-provider";

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
    const locale = getLocale();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(locale, "invalid_request_error") }, { status: 400 });

    const plan = await prisma.plan.findUnique({ where: { key: parsed.data.planKey } });
    if (!plan) throw new HttpError(404, t(locale, "plan_not_found_error"));
    if (plan.priceMAD > 0) {
      throw new HttpError(400, t(locale, "plan_is_paid_error"));
    }
    // Sans ces deux vérifications, masquer le gratuit ou forcer une formule
    // pour tous (réglages Admin) n'aurait aucun effet réel : n'importe qui
    // pourrait quand même appeler cette route directement avec la clé
    // "free" et obtenir un accès gratuit illimité, contournant entièrement
    // l'intention de l'admin de rendre le paiement obligatoire.
    const settings = await getPlatformSettings();
    if (!plan.visible) throw new HttpError(400, t(locale, "plan_unavailable_error"));
    if (settings.forcedPlanId && settings.forcedPlanId !== plan.id) {
      throw new HttpError(400, t(locale, "plan_unavailable_error"));
    }

    const current = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!current) throw new HttpError(404, t(locale, "org_not_found_error"));
    if (hasProviderSubscription(current)) {
      const inPaidPeriod = !current.currentPeriodEnd || current.currentPeriodEnd > new Date();
      const paidStillRunning = (current.subscriptionStatus === "ACTIVE" || current.subscriptionStatus === "CANCELING") && inPaidPeriod;
      // Un abonnement payant en cours doit être résilié depuis Réglages
      // (accès conservé jusqu'à la fin de la période) — passer au gratuit
      // ici laissait Stripe/PayPal continuer à facturer en arrière-plan.
      if (paidStillRunning) throw new HttpError(400, t(locale, "cancel_paid_first_error"));
      // Reliquat d'un abonnement en échec de paiement/expiré : on le clôt
      // proprement chez le prestataire pour qu'il ne se réactive jamais
      // tout seul par-dessus la formule gratuite.
      await cancelProviderSubscriptionNow(current);
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
        stripeSubscriptionId: null,
        paypalSubscriptionId: null,
      },
    });

    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}
