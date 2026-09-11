import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { getStripe } from "@/lib/stripe";
import { getPlatformSettings } from "@/lib/settings";
import { hasProviderSubscription } from "@/lib/subscription-provider";

const bodySchema = z.object({
  planKey: z.string(),
  interval: z.enum(["monthly", "annual"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const locale = getLocale();
    const settings = await getPlatformSettings();
    if (!settings.stripeEnabled) throw new HttpError(400, t(locale, "card_payment_disabled_error"));

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(locale, "invalid_request_error") }, { status: 400 });
    const { planKey, interval } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) throw new HttpError(404, t(locale, "plan_not_found_error"));
    // Respecte les réglages admin (formule masquée / formule forcée pour
    // tous) même si la requête est envoyée directement à l'API plutôt que
    // via le bouton — sans quoi ces réglages n'auraient aucun effet réel.
    if (!plan.visible) throw new HttpError(400, t(locale, "plan_unavailable_error"));
    if (settings.forcedPlanId && settings.forcedPlanId !== plan.id) {
      throw new HttpError(400, t(locale, "plan_unavailable_error"));
    }

    const priceId = interval === "monthly" ? plan.stripePriceIdMonthly : plan.stripePriceIdAnnual;
    if (!priceId) throw new HttpError(400, t(locale, "no_stripe_price_error"));

    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) throw new HttpError(404, t(locale, "org_not_found_error"));
    // Un abonnement payant déjà en cours (chez Stripe ou PayPal) ne doit
    // pas pouvoir être doublé par un second paiement — la page /abonnement
    // n'est pas affichée dans ce cas, mais un appel direct l'était.
    const inPaidPeriod = !org.currentPeriodEnd || org.currentPeriodEnd > new Date();
    if (hasProviderSubscription(org) && (org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "CANCELING") && inPaidPeriod) {
      throw new HttpError(400, t(locale, "already_subscribed_error"));
    }

    const stripe = getStripe();

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.email,
        metadata: { organizationId: org.id },
      });
      customerId = customer.id;
      await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const origin = req.nextUrl.origin;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Même page d'attente que PayPal : elle laisse le temps au webhook
      // (seule source d'activation) d'arriver — renvoyer directement vers
      // une page protégée renvoyait l'utilisateur sur /abonnement comme si
      // le paiement avait échoué quand le webhook mettait quelques secondes.
      success_url: `${origin}/abonnement/confirmation`,
      cancel_url: `${origin}/abonnement`,
      metadata: { organizationId: org.id, planKey, interval },
      subscription_data: { metadata: { organizationId: org.id, planKey, interval } },
    });

    if (!checkoutSession.url) throw new HttpError(500, t(locale, "checkout_create_failed_error"));
    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    return handleApiError(e);
  }
}
