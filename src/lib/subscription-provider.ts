import type { Organization } from "@prisma/client";
import { getStripe } from "./stripe";
import { paypalFetch } from "./paypal";
import { HttpError } from "./guards";
import { getLocale } from "./get-locale";
import { t } from "./i18n";

type ProviderIds = Pick<Organization, "stripeSubscriptionId" | "paypalSubscriptionId">;

/** L'organisation a-t-elle un abonnement réellement porté par Stripe ou PayPal ? */
export function hasProviderSubscription(org: ProviderIds): boolean {
  return !!(org.stripeSubscriptionId || org.paypalSubscriptionId);
}

function providerFailure(context: string, e: unknown): never {
  console.error(`Échec côté prestataire de paiement (${context}) :`, e);
  throw new HttpError(502, t(getLocale(), "provider_error"));
}

/**
 * Annule DÉFINITIVEMENT et immédiatement l'abonnement Stripe/PayPal en
 * cours — utilisé quand l'admin offre un accès gratuit : sans ça, le client
 * continuerait à être réellement facturé en plus de son accès offert.
 * Échec silencieux et journalisé si le prestataire n'est pas configuré ou
 * l'abonnement déjà résilié : ça ne doit jamais bloquer l'offre elle-même.
 */
export async function cancelProviderSubscriptionNow(org: ProviderIds): Promise<void> {
  if (org.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(org.stripeSubscriptionId);
    } catch (e) {
      console.error("Échec d'annulation de l'abonnement Stripe existant :", e);
    }
  }
  if (org.paypalSubscriptionId) {
    try {
      await paypalFetch(`/v1/billing/subscriptions/${org.paypalSubscriptionId}/cancel`, {
        method: "POST",
        body: { reason: "Access granted by the administrator" },
      });
    } catch (e) {
      console.error("Échec d'annulation de l'abonnement PayPal existant :", e);
    }
  }
}

/**
 * Résiliation "à la fin de la période payée", déclenchée par le
 * propriétaire. C'est le prestataire qui doit cesser de facturer — marquer
 * seulement la base locale (comme avant) laissait Stripe/PayPal prélever
 * le mois suivant, et le webhook de renouvellement réactivait alors le
 * compte comme si de rien n'était.
 *
 * - Stripe : cancel_at_period_end (l'accès reste jusqu'à la fin de la
 *   période, puis Stripe envoie customer.subscription.deleted).
 * - PayPal : pas d'équivalent natif — on SUSPEND l'abonnement (plus aucun
 *   prélèvement), ce qui reste réversible via /activate si le propriétaire
 *   change d'avis avant la fin de la période. Le webhook SUSPENDED sait
 *   qu'il s'agit d'une résiliation volontaire (cancelAtPeriodEnd) et ne
 *   bascule pas le compte en "paiement en échec".
 *
 * Lève une erreur (rien n'est modifié en base) si le prestataire refuse.
 */
export async function requestProviderCancelAtPeriodEnd(org: ProviderIds): Promise<void> {
  if (org.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.update(org.stripeSubscriptionId, { cancel_at_period_end: true });
    } catch (e) {
      providerFailure("résiliation Stripe", e);
    }
  } else if (org.paypalSubscriptionId) {
    try {
      await paypalFetch(`/v1/billing/subscriptions/${org.paypalSubscriptionId}/suspend`, {
        method: "POST",
        body: { reason: "Cancelled by the customer" },
      });
    } catch (e) {
      providerFailure("suspension PayPal", e);
    }
  }
}

/** Annule une résiliation programmée (miroir exact de requestProviderCancelAtPeriodEnd). */
export async function resumeProviderSubscription(org: ProviderIds): Promise<void> {
  if (org.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.update(org.stripeSubscriptionId, { cancel_at_period_end: false });
    } catch (e) {
      providerFailure("réactivation Stripe", e);
    }
  } else if (org.paypalSubscriptionId) {
    try {
      await paypalFetch(`/v1/billing/subscriptions/${org.paypalSubscriptionId}/activate`, {
        method: "POST",
        body: { reason: "Reactivated by the customer" },
      });
    } catch (e) {
      providerFailure("réactivation PayPal", e);
    }
  }
}
