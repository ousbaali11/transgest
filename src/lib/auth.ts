import { cache } from "react";
import { createHash } from "crypto";
import type { Organization } from "@prisma/client";
import { prisma } from "./prisma";
import { getSession, type SessionPayload } from "./session";

type OrgSession = Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>;

/** Empreinte du code d'accès chauffeur stockée dans la session (jamais le code lui-même). */
export function hashAccessCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Organisation déjà chargée pour une session donnée, pendant la requête en
 * cours. Clé = l'objet session lui-même (WeakMap : libéré avec lui) — ce
 * qui permet à assertOrgActive() de réutiliser l'organisation lue par
 * getValidSession() sans dépendre de React cache(), inactif dans les Route
 * Handlers (il ne mémoïse que pendant le rendu des Server Components).
 */
const orgBySession = new WeakMap<object, Organization>();

/**
 * Session "valide" : le cookie est signé ET, pour un chauffeur, son profil
 * existe encore dans la même organisation avec le même code d'accès que
 * celui utilisé à la connexion.
 *
 * Sans cette vérification, un cookie de chauffeur restait utilisable 400
 * jours après que le propriétaire l'ait supprimé ou ait régénéré son code.
 * Toutes les pages et routes qui prennent une décision d'accès passent par
 * ici — jamais par getSession() directement.
 *
 * Coût : aucune requête pour un propriétaire ou l'admin ; UNE requête pour
 * un chauffeur, qui rapporte aussi son organisation (jointure) — celle-ci
 * est mise de côté pour loadOrg(), si bien que valider la session ET
 * l'abonnement ne coûte pas plus d'aller-retour qu'avant l'ajout de cette
 * vérification. Mémoïsée par React cache() : layout + page d'une même
 * requête ne la déclenchent qu'une fois.
 */
export const getValidSession = cache(async (): Promise<SessionPayload | null> => {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "DRIVER") return session;

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { organizationId: true, accessCode: true, organization: true },
  });
  if (!driver || driver.organizationId !== session.organizationId) return null;
  if (!driver.accessCode || !session.codeHash || hashAccessCode(driver.accessCode) !== session.codeHash) return null;
  orgBySession.set(session, driver.organization);
  return session;
});

/**
 * Organisation de la session : celle déjà rapportée par la jointure de
 * getValidSession() (chauffeur), sinon une lecture par clé primaire
 * (propriétaire), faite une seule fois par session et par requête.
 */
export async function loadOrg(session: OrgSession): Promise<Organization | null> {
  const cached = orgBySession.get(session);
  if (cached) return cached;
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (org) orgBySession.set(session, org);
  return org;
}
