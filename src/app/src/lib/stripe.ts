import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Instance Stripe partagée — lève une erreur claire si la clé n'est pas configurée. */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY manquant — Stripe n'est pas configuré.");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}
