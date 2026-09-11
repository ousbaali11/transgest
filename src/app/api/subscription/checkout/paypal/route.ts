import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { paypalFetch } from "@/lib/paypal";
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
    if (!settings.paypalEnabled) throw new HttpError(400, t(locale, "paypal_disabled_error"));

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(locale, "invalid_request_error") }, { status: 400 });
    const { planKey, interval } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) throw new HttpError(404, t(locale, "plan_not_found_error"));
    if (!plan.visible) throw new HttpError(400, t(locale, "plan_unavailable_error"));
    if (settings.forcedPlanId && settings.forcedPlanId !== plan.id) {
      throw new HttpError(400, t(locale, "plan_unavailable_error"));
    }

    const paypalPlanId = interval === "monthly" ? plan.paypalPlanIdMonthly : plan.paypalPlanIdAnnual;
    if (!paypalPlanId) throw new HttpError(400, t(locale, "no_paypal_plan_error"));

    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) throw new HttpError(404, t(locale, "org_not_found_error"));
    // Même garde-fou que pour Stripe : pas de second abonnement payant
    // par-dessus un abonnement encore en cours.
    const inPaidPeriod = !org.currentPeriodEnd || org.currentPeriodEnd > new Date();
    if (hasProviderSubscription(org) && (org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "CANCELING") && inPaidPeriod) {
      throw new HttpError(400, t(locale, "already_subscribed_error"));
    }

    const origin = req.nextUrl.origin;
    const subscription = await paypalFetch("/v1/billing/subscriptions", {
      method: "POST",
      headers: { "PayPal-Request-Id": `${session.organizationId}-${planKey}-${interval}-${Date.now()}` },
      body: {
        plan_id: paypalPlanId,
        custom_id: session.organizationId, // retrouvé depuis le webhook
        application_context: {
          brand_name: settings.appName,
          return_url: `${origin}/abonnement/confirmation`,
          cancel_url: `${origin}/abonnement`,
          user_action: "SUBSCRIBE_NOW",
        },
      },
    });

    const approveLink = (subscription.links || []).find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    if (!approveLink) throw new HttpError(500, t(locale, "checkout_create_failed_error"));

    return NextResponse.json({ url: approveLink });
  } catch (e) {
    return handleApiError(e);
  }
}
