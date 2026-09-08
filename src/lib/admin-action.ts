import { prisma } from "./prisma";
import { HttpError } from "./guards";
import { getLocale } from "./get-locale";
import { t } from "./i18n";

export type AdminActionPurpose = "VIEW_SUBSCRIPTIONS" | "CHANGE_CONTACT_EMAIL";

/**
 * Vérifie côté serveur qu'un code de vérification a été validé récemment
 * (fenêtre de 15 minutes, voir /api/admin/action-code/verify) pour cet
 * usage précis — à appeler dans CHAQUE route qui modifie une donnée
 * protégée par AdminActionCodeGate (formules d'abonnement, email de
 * contact). Sans cet appel, la protection ne serait qu'un habillage côté
 * interface, jamais réellement appliquée : une requête directe vers la
 * route (sans jamais passer par le composant de vérification) réussirait
 * quand même tant que la session admin est valide.
 */
export async function assertActionVerified(purpose: AdminActionPurpose): Promise<void> {
  const recent = await prisma.adminActionCode.findFirst({
    where: { purpose, verifiedUntil: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!recent) {
    throw new HttpError(403, t(getLocale(), "admin_action_verification_required"));
  }
}
