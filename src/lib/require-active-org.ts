import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";

/**
 * À appeler en haut de chaque Server Component réservé aux propriétaires
 * (dashboard, voyages, dépenses…). Redirige vers /login si non authentifié,
 * ou vers /abonnement si l'abonnement de l'organisation n'est pas actif.
 *
 * Pour éviter de dupliquer cet appel dans chaque page, envisagez de déplacer
 * ces routes dans un groupe `src/app/(app)/layout.tsx` qui appelle cette
 * fonction une seule fois.
 */
export async function requireActiveOrg() {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) {
    redirect("/login");
  }
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");

  const now = new Date();
  // Seuls ACTIVE et CANCELING (résilié mais encore dans la période payée)
  // donnent accès — PAST_DUE (paiement en échec) et NONE/EXPIRED bloquent
  // explicitement, même si currentPeriodEnd n'est pas encore dépassée.
  const statusGrantsAccess = org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "CANCELING";
  const periodStillValid = !org.currentPeriodEnd || org.currentPeriodEnd > now;
  const active = statusGrantsAccess && periodStillValid;

  if (!active) {
    const hadSubscriptionBefore = org.subscriptionStatus !== "NONE";
    redirect(hadSubscriptionBefore ? "/abonnement?reason=expired" : "/abonnement");
  }

  return { session, org };
}
