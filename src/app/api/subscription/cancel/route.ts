import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

export async function POST() {
  try {
    const session = await requireOwnerSession();
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (org?.grantedByAdmin) {
      throw new HttpError(400, t(getLocale(), "cannot_cancel_admin_grant"));
    }
    // Une formule gratuite n'a pas de date de fin de période — "résilier
    // avec accès jusqu'à..." n'a pas de sens dans ce cas (et laisserait le
    // compte actif indéfiniment malgré le statut CANCELING, puisque
    // isOrgActive() considère une période sans date de fin comme valide).
    // On révoque donc l'accès immédiatement plutôt que de programmer une
    // fin de période qui n'existe pas.
    const data = org?.currentPeriodEnd
      ? { cancelAtPeriodEnd: true, canceledAt: new Date(), subscriptionStatus: "CANCELING" as const }
      : { cancelAtPeriodEnd: false, canceledAt: new Date(), subscriptionStatus: "NONE" as const, planId: null };
    const updated = await prisma.organization.update({ where: { id: session.organizationId }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
