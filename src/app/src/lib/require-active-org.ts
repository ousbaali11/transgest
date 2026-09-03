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
  const expired = org.currentPeriodEnd ? org.currentPeriodEnd < now : org.subscriptionStatus === "NONE";
  const active = org.subscriptionStatus !== "NONE" && !expired;

  if (!active) {
    redirect(expired && org.subscriptionStatus !== "NONE" ? "/abonnement?reason=expired" : "/abonnement");
  }

  return { session, org };
}
