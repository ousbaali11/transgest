import { prisma } from "./prisma";
import { HttpError } from "./guards";
import { getLocale } from "./get-locale";
import { t } from "./i18n";
import type { SessionPayload } from "./session";

type OrgSession = Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>;

/**
 * Vérifications d'appartenance des identifiants reçus dans le corps d'une
 * requête (truckId, driverId, clientId, tripId). Sans elles, un compte
 * pouvait rattacher un voyage ou une dépense au camion, au chauffeur ou au
 * client d'une AUTRE organisation en devinant/copiant un identifiant —
 * Prisma ne vérifie que l'existence de la ligne, pas à qui elle appartient.
 *
 * Un identifiant absent (null/undefined) est accepté tel quel : c'est le
 * cas "aucun client", "aucun chauffeur"... déjà prévu par le schéma.
 */
function invalidRef(): never {
  throw new HttpError(400, t(getLocale(), "invalid_reference_error"));
}

export async function assertTruckInOrg(organizationId: string, truckId: string | null | undefined) {
  if (!truckId) return;
  const truck = await prisma.truck.findUnique({ where: { id: truckId }, select: { organizationId: true } });
  if (!truck || truck.organizationId !== organizationId) invalidRef();
}

export async function assertDriverInOrg(organizationId: string, driverId: string | null | undefined) {
  if (!driverId) return;
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { organizationId: true } });
  if (!driver || driver.organizationId !== organizationId) invalidRef();
}

export async function assertClientInOrg(organizationId: string, clientId: string | null | undefined) {
  if (!clientId) return;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { organizationId: true } });
  if (!client || client.organizationId !== organizationId) invalidRef();
}

/**
 * Un voyage référencé par une dépense doit appartenir à l'organisation ET,
 * pour un chauffeur, le concerner (lui être assigné ou saisi par lui) —
 * même règle de visibilité que la liste des voyages.
 */
export async function assertTripUsableBy(session: OrgSession, tripId: string | null | undefined) {
  if (!tripId) return;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { organizationId: true, driverId: true, createdByUserId: true } });
  if (!trip || trip.organizationId !== session.organizationId) invalidRef();
  if (session.role === "DRIVER" && trip.driverId !== session.driverId && trip.createdByUserId !== session.userId) {
    throw new HttpError(403, t(getLocale(), "driver_trip_scope_error"));
  }
}

/**
 * Filtre Prisma "ce qui concerne ce chauffeur" (voyages/dépenses assignés
 * OU saisis par lui) — vide pour un propriétaire, qui voit tout. Un seul
 * endroit pour cette règle : les pages ET les routes API l'utilisent, pour
 * qu'une liste ne soit jamais plus large côté API que côté écran.
 */
export function driverScope(session: OrgSession): { OR: { driverId?: string; createdByUserId?: string }[] } | Record<string, never> {
  if (session.role !== "DRIVER") return {};
  return { OR: [{ driverId: session.driverId }, { createdByUserId: session.userId }] };
}

/** Un voyage donné concerne-t-il ce chauffeur ? (même règle que driverScope, pour un enregistrement déjà chargé). */
export function tripConcernsSession(session: OrgSession, trip: { driverId: string | null; createdByUserId: string | null }): boolean {
  if (session.role !== "DRIVER") return true;
  return trip.driverId === session.driverId || trip.createdByUserId === session.userId;
}

/**
 * Prochain numéro de facture "AAAA-NNNN" : suite du plus grand numéro déjà
 * émis cette année, et non `nombre de factures + 1` — ce dernier générait
 * un doublon (et une erreur "valeur déjà utilisée") dès qu'une facture
 * avait été supprimée, puisque le compteur redescendait.
 */
export async function nextInvoiceNumber(organizationId: string): Promise<string> {
  const year = String(new Date().getFullYear());
  const existing = await prisma.invoice.findMany({
    where: { organizationId, number: { startsWith: `${year}-` } },
    select: { number: true },
  });
  let max = 0;
  for (const inv of existing) {
    const seq = parseInt(inv.number.slice(year.length + 1), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${year}-${String(max + 1).padStart(4, "0")}`;
}
