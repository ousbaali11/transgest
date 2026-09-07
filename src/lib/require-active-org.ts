import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";
import { HttpError } from "./guards";
import { getLocale } from "./get-locale";
import { t } from "./i18n";
import type { Organization } from "@prisma/client";

/**
 * Seule source de vérité pour "cette organisation a-t-elle un accès actif ?"
 * — utilisée à la fois par requireActiveOrg() (pages, redirige) et
 * assertOrgActive() (routes API, lève une erreur). Ne JAMAIS dupliquer
 * cette logique ailleurs : toute divergence entre les deux recréerait la
 * faille où l'API reste utilisable après expiration côté pages.
 */
export function isOrgActive(org: Pick<Organization, "subscriptionStatus" | "currentPeriodEnd" | "lockedByAdmin">): boolean {
  // Le verrou admin prime sur tout le reste, y compris un abonnement payant
  // par ailleurs valide — c'est une décision manuelle et délibérée de
  // l'admin, qui doit toujours avoir le dernier mot.
  if (org.lockedByAdmin) return false;

  const now = new Date();
  // Seuls ACTIVE et CANCELING (résilié mais encore dans la période payée)
  // donnent accès — PAST_DUE (paiement en échec) et NONE/EXPIRED bloquent
  // explicitement, même si currentPeriodEnd n'est pas encore dépassée.
  const statusGrantsAccess = org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "CANCELING";
  const periodStillValid = !org.currentPeriodEnd || org.currentPeriodEnd > now;
  return statusGrantsAccess && periodStillValid;
}

/**
 * À appeler en haut de chaque Server Component réservé aux propriétaires
 * (dashboard, voyages, dépenses…). Redirige vers /login si non authentifié,
 * ou vers /abonnement si l'abonnement de l'organisation n'est pas actif.
 */
export async function requireActiveOrg() {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) {
    redirect("/login");
  }
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");

  if (!isOrgActive(org)) {
    if (org.lockedByAdmin) redirect("/abonnement?reason=locked");
    const hadSubscriptionBefore = org.subscriptionStatus !== "NONE";
    redirect(hadSubscriptionBefore ? "/abonnement?reason=expired" : "/abonnement");
  }

  return { session, org };
}

/**
 * Équivalent de requireActiveOrg() pour les routes API : lève une erreur
 * HTTP 402 au lieu de rediriger (impossible de rediriger une requête API).
 * Sans ce garde-fou, un compte dont l'abonnement a expiré pourrait continuer
 * à créer/modifier des données indéfiniment en appelant l'API directement,
 * même si les pages elles-mêmes le renvoient vers /abonnement.
 *
 * Ne PAS appeler dans les routes qui gèrent l'abonnement lui-même
 * (subscribe, checkout, cancel, reactivate) : ce serait un verrou sans
 * issue, empêchant justement d'activer un abonnement.
 */
export async function assertOrgActive(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org || !isOrgActive(org)) {
    throw new HttpError(402, t(getLocale(), "subscription_inactive_error"));
  }
}
