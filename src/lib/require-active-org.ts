import { redirect } from "next/navigation";
import { getValidSession, loadOrg } from "./auth";
import { HttpError } from "./guards";
import { getLocale } from "./get-locale";
import { t } from "./i18n";
import type { Organization } from "@prisma/client";
import type { SessionPayload } from "./session";

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
 * Raison pour laquelle un compte est bloqué, déduite de l'état RÉEL en base
 * (jamais d'un paramètre d'URL figé) — partagée entre requireActiveOrg() et
 * la page /abonnement pour qu'ils racontent toujours la même histoire.
 */
export function inactiveReason(org: Pick<Organization, "subscriptionStatus" | "lockedByAdmin">): "locked" | "expired" | "none" {
  if (org.lockedByAdmin) return "locked";
  return org.subscriptionStatus !== "NONE" ? "expired" : "none";
}

/**
 * À appeler en haut de chaque Server Component réservé aux propriétaires
 * (dashboard, voyages, dépenses…). Redirige vers /login si non authentifié,
 * ou vers /abonnement si l'abonnement de l'organisation n'est pas actif.
 * Une seule requête au total (voir getValidSession / loadOrg).
 */
export async function requireActiveOrg() {
  const session = await getValidSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) {
    redirect("/login");
  }
  const org = await loadOrg(session);
  if (!org) redirect("/login");

  if (!isOrgActive(org)) {
    const reason = inactiveReason(org);
    redirect(reason === "none" ? "/abonnement" : `/abonnement?reason=${reason}`);
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
 * Prend la session renvoyée par requireOrgSession()/requireOwnerSession()
 * (et non un simple identifiant) pour réutiliser l'organisation déjà
 * chargée avec elle : pas de seconde lecture en base.
 *
 * Ne PAS appeler dans les routes qui gèrent l'abonnement lui-même
 * (subscribe, checkout, cancel, reactivate) : ce serait un verrou sans
 * issue, empêchant justement d'activer un abonnement.
 */
export async function assertOrgActive(session: Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>): Promise<void> {
  const org = await loadOrg(session);
  if (!org || !isOrgActive(org)) {
    throw new HttpError(402, t(getLocale(), "subscription_inactive_error"));
  }
}
