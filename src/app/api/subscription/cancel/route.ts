import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { hasProviderSubscription, requestProviderCancelAtPeriodEnd } from "@/lib/subscription-provider";

export async function POST() {
  try {
    const session = await requireOwnerSession();
    const locale = getLocale();
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) throw new HttpError(404, t(locale, "org_not_found_error"));
    if (org.grantedByAdmin) {
      throw new HttpError(400, t(locale, "cannot_cancel_admin_grant"));
    }
    // Déjà résilié : rien à refaire (et surtout pas un second appel au
    // prestataire).
    if (org.cancelAtPeriodEnd) return NextResponse.json(org);

    // Une formule gratuite n'a pas de date de fin de période — "résilier
    // avec accès jusqu'à..." n'a pas de sens dans ce cas (et laisserait le
    // compte actif indéfiniment malgré le statut CANCELING, puisque
    // isOrgActive() considère une période sans date de fin comme valide).
    // On révoque donc l'accès immédiatement plutôt que de programmer une
    // fin de période qui n'existe pas.
    if (!org.currentPeriodEnd) {
      const updated = await prisma.organization.update({
        where: { id: org.id },
        data: { cancelAtPeriodEnd: false, canceledAt: new Date(), subscriptionStatus: "NONE", planId: null },
      });
      return NextResponse.json(updated);
    }

    // Abonnement payant : c'est le PRESTATAIRE qui doit arrêter de facturer.
    // Avant, seule la base locale était marquée "résilié" — Stripe/PayPal
    // prélevait le mois suivant et le webhook de renouvellement réactivait
    // le compte. Si le prestataire refuse, rien n'est modifié ici.
    if (hasProviderSubscription(org)) {
      await requestProviderCancelAtPeriodEnd(org);
    }
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date(), subscriptionStatus: "CANCELING" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
