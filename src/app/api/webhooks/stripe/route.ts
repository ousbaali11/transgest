import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/**
 * Reçoit les événements Stripe (paiement confirmé, abonnement modifié,
 * abonnement résilié...) et met à jour l'organisation en conséquence.
 * C'est la SEULE source de vérité pour activer un abonnement payant — jamais
 * le clic du bouton côté client, qui ne prouve aucun paiement réel.
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Signature Stripe invalide :", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const organizationId = cs.metadata?.organizationId;
        const planKey = cs.metadata?.planKey;
        const interval = cs.metadata?.interval;
        if (organizationId && cs.subscription) {
          const subId = typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const plan = planKey ? await prisma.plan.findUnique({ where: { key: planKey } }) : null;
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              planId: plan?.id,
              billingInterval: interval || null,
              subscriptionStatus: "ACTIVE",
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: false,
              canceledAt: null,
              grantedByAdmin: false,
              stripeSubscriptionId: sub.id,
              paymentProvider: "stripe",
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const organizationId = sub.metadata?.organizationId;
        if (organizationId) {
          const status: "ACTIVE" | "CANCELING" | "PAST_DUE" | "NONE" =
            sub.status === "active" ? (sub.cancel_at_period_end ? "CANCELING" : "ACTIVE")
            : sub.status === "past_due" || sub.status === "unpaid" ? "PAST_DUE"
            : sub.status === "canceled" ? "NONE"
            : "ACTIVE";
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              subscriptionStatus: status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const organizationId = sub.metadata?.organizationId;
        if (organizationId) {
          // Ne jamais écraser un accès offert entre-temps par l'admin.
          const org = await prisma.organization.findUnique({ where: { id: organizationId } });
          if (org && !org.grantedByAdmin) {
            await prisma.organization.update({
              where: { id: organizationId },
              data: { subscriptionStatus: "NONE", cancelAtPeriodEnd: false, stripeSubscriptionId: null },
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("Erreur de traitement du webhook Stripe :", e);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
