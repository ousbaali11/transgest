import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { paypalFetch } from "@/lib/paypal";
import { getPlatformSettings } from "@/lib/settings";

const bodySchema = z.object({
  planKey: z.string(),
  interval: z.enum(["monthly", "annual"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const settings = await getPlatformSettings();
    if (!settings.paypalEnabled) throw new HttpError(400, "Le paiement par PayPal n'est pas activé.");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    const { planKey, interval } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) throw new HttpError(404, "Formule introuvable");

    const paypalPlanId = interval === "monthly" ? plan.paypalPlanIdMonthly : plan.paypalPlanIdAnnual;
    if (!paypalPlanId) throw new HttpError(400, "Cette formule n'a pas de plan PayPal configuré pour cette périodicité.");

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
    if (!approveLink) throw new HttpError(500, "Impossible de créer l'abonnement PayPal.");

    return NextResponse.json({ url: approveLink });
  } catch (e) {
    return handleApiError(e);
  }
}
