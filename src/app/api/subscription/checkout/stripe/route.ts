import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getStripe } from "@/lib/stripe";
import { getPlatformSettings } from "@/lib/settings";

const bodySchema = z.object({
  planKey: z.string(),
  interval: z.enum(["monthly", "annual"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const settings = await getPlatformSettings();
    if (!settings.stripeEnabled) throw new HttpError(400, "Le paiement par carte n'est pas activé.");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    const { planKey, interval } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) throw new HttpError(404, "Formule introuvable");

    const priceId = interval === "monthly" ? plan.stripePriceIdMonthly : plan.stripePriceIdAnnual;
    if (!priceId) throw new HttpError(400, "Cette formule n'a pas de prix Stripe configuré pour cette périodicité.");

    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) throw new HttpError(404, "Organisation introuvable");

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
      success_url: `${origin}/reglages?checkout=success`,
      cancel_url: `${origin}/abonnement`,
      metadata: { organizationId: org.id, planKey, interval },
      subscription_data: { metadata: { organizationId: org.id, planKey, interval } },
    });

    if (!checkoutSession.url) throw new HttpError(500, "Impossible de créer la session de paiement.");
    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    return handleApiError(e);
  }
}
