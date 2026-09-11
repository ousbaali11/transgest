import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { hasProviderSubscription, resumeProviderSubscription } from "@/lib/subscription-provider";

export async function POST() {
  try {
    const session = await requireOwnerSession();
    const locale = getLocale();
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    // Garde-fou critique : sans cette vérification, n'importe quel compte
    // authentifié pourrait appeler cette route directement (hors de tout
    // bouton) et obtenir un accès actif illimité sans jamais avoir payé.
    // Réactiver n'a de sens que pour ANNULER une résiliation déjà en cours.
    if (!org || !org.cancelAtPeriodEnd) {
      throw new HttpError(400, t(locale, "no_cancellation_pending_error"));
    }
    // Période payée déjà terminée : il n'y a plus rien à "reprendre", il
    // faut souscrire à nouveau (sinon on remettait ACTIVE sur une période
    // échue, sans aucun paiement derrière).
    if (org.currentPeriodEnd && org.currentPeriodEnd <= new Date()) {
      throw new HttpError(400, t(locale, "reactivate_expired_error"));
    }
    // Le prestataire doit reprendre la facturation, sinon Stripe/PayPal
    // coupait quand même l'abonnement à la fin de la période.
    if (hasProviderSubscription(org)) {
      await resumeProviderSubscription(org);
    }
    const updated = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { cancelAtPeriodEnd: false, canceledAt: null, subscriptionStatus: "ACTIVE" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
