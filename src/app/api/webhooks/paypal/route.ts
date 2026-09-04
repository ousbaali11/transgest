import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalFetch } from "@/lib/paypal";

/**
 * Vérifie l'authenticité d'un webhook PayPal en rappelant leur API de
 * vérification (PayPal n'utilise pas de simple signature HMAC comme
 * Stripe — il faut leur repasser la transmission complète).
 */
async function verifyPaypalWebhook(headers: Headers, body: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  try {
    const result = await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: {
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_time: headers.get("paypal-transmission-time"),
        cert_url: headers.get("paypal-cert-url"),
        auth_algo: headers.get("paypal-auth-algo"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        webhook_id: webhookId,
        webhook_event: body,
      },
    });
    return result.verification_status === "SUCCESS";
  } catch (e) {
    console.error("Échec de vérification du webhook PayPal :", e);
    return false;
  }
}

function computePeriodEnd(interval: "monthly" | "annual" | null): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + (interval === "annual" ? 12 : 1));
  return d;
}

export async function POST(req: NextRequest) {
  const event = await req.json();

  const valid = await verifyPaypalWebhook(req.headers, event);
  if (!valid) {
    console.error("Signature de webhook PayPal invalide, événement rejeté.");
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    const resource = event.resource || {};
    const organizationId: string | undefined = resource.custom_id;

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        if (organizationId) {
          const planId: string | undefined = resource.plan_id;
          const plan = planId
            ? await prisma.plan.findFirst({ where: { OR: [{ paypalPlanIdMonthly: planId }, { paypalPlanIdAnnual: planId }] } })
            : null;
          const interval: "monthly" | "annual" | null = plan
            ? (plan.paypalPlanIdMonthly === planId ? "monthly" : "annual")
            : null;
          const nextBilling = resource.billing_info?.next_billing_time;

          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              planId: plan?.id,
              billingInterval: interval,
              subscriptionStatus: "ACTIVE",
              currentPeriodEnd: nextBilling ? new Date(nextBilling) : computePeriodEnd(interval),
              cancelAtPeriodEnd: false,
              canceledAt: null,
              grantedByAdmin: false,
              paypalSubscriptionId: resource.id,
              paymentProvider: "paypal",
            },
          });
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Renouvellement réussi — on prolonge la période si on peut retrouver l'organisation.
        const billingAgreementId = resource.billing_agreement_id;
        if (billingAgreementId) {
          const org = await prisma.organization.findFirst({ where: { paypalSubscriptionId: billingAgreementId } });
          if (org && !org.grantedByAdmin) {
            await prisma.organization.update({
              where: { id: org.id },
              data: { subscriptionStatus: "ACTIVE", currentPeriodEnd: computePeriodEnd(org.billingInterval as "monthly" | "annual" | null) },
            });
          }
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const org = await prisma.organization.findFirst({ where: { paypalSubscriptionId: resource.id } });
        if (org && !org.grantedByAdmin) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { subscriptionStatus: "NONE", cancelAtPeriodEnd: false, paypalSubscriptionId: null },
          });
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "PAYMENT.SALE.DENIED": {
        const org = await prisma.organization.findFirst({ where: { paypalSubscriptionId: resource.id || resource.billing_agreement_id } });
        if (org && !org.grantedByAdmin) {
          await prisma.organization.update({ where: { id: org.id }, data: { subscriptionStatus: "PAST_DUE" } });
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("Erreur de traitement du webhook PayPal :", e);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
