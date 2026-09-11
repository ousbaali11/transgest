import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/**
 * Reçoit les événements Stripe (paiement confirmé, abonnement modifié,
 * abonnement résilié...) et met à jour l'organisation en conséquence.
 * C'est la SEULE source de vérité pour activer un abonnement payant — jamais
 * le clic du bouton côté client, qui ne prouve aucun paiement réel.
 *
 * Les réponses de cette route s'adressent au serveur Stripe (visibles dans
 * son tableau de bord), pas à un utilisateur : elles restent en anglais.
 */

/** Statut local dérivé du statut Stripe — NONE quand l'abonnement n'existe plus. */
function mapStripeStatus(sub: Stripe.Subscription): "ACTIVE" | "CANCELING" | "PAST_DUE" | "NONE" {
  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancel_at_period_end ? "CANCELING" : "ACTIVE";
    case "canceled":
    case "incomplete_expired":
      return "NONE";
    // past_due, unpaid, incomplete (premier paiement jamais abouti), paused :
    // aucun de ces états ne doit donner accès — avant, tout statut inconnu
    // retombait sur ACTIVE, y compris "incomplete".
    default:
      return "PAST_DUE";
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Signature Stripe invalide :", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
              lockedByAdmin: false, // un vrai paiement lève automatiquement un verrou admin éventuel
              stripeSubscriptionId: sub.id,
              paypalSubscriptionId: null, // un seul abonnement porté à la fois
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
          // Ne jamais écraser un accès offert par l'admin avec l'état d'un
          // abonnement Stripe encore actif en arrière-plan, ni appliquer
          // l'état d'un ANCIEN abonnement (résilié lors d'une offre admin,
          // remplacé depuis...) à l'organisation : seul l'abonnement
          // actuellement rattaché compte.
          const org = await prisma.organization.findUnique({ where: { id: organizationId } });
          if (org && !org.grantedByAdmin && org.stripeSubscriptionId === sub.id) {
            const status = mapStripeStatus(sub);
            await prisma.organization.update({
              where: { id: organizationId },
              data: {
                subscriptionStatus: status,
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                cancelAtPeriodEnd: sub.cancel_at_period_end,
                ...(status === "NONE" ? { stripeSubscriptionId: null } : {}),
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const organizationId = sub.metadata?.organizationId;
        if (organizationId) {
          // Ne jamais écraser un accès offert entre-temps par l'admin, ni
          // réagir à la suppression d'un abonnement qui n'est plus celui
          // de l'organisation.
          const org = await prisma.organization.findUnique({ where: { id: organizationId } });
          if (org && !org.grantedByAdmin && org.stripeSubscriptionId === sub.id) {
            await prisma.organization.update({
              where: { id: organizationId },
              data: { subscriptionStatus: "NONE", cancelAtPeriodEnd: false, stripeSubscriptionId: null },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // Signal explicite et immédiat d'un prélèvement récurrent qui a
        // échoué (carte refusée, expirée...) — en plus de
        // customer.subscription.updated qui reflète le même changement,
        // mais avec un peu de latence. Les deux mettent à jour le même
        // champ, aucun risque de conflit à les avoir tous les deux.
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
          const organizationId = sub.metadata?.organizationId;
          if (organizationId) {
            const org = await prisma.organization.findUnique({ where: { id: organizationId } });
            if (org && !org.grantedByAdmin && org.stripeSubscriptionId === sub.id) {
              await prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: "PAST_DUE" } });
            }
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("Erreur de traitement du webhook Stripe :", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
