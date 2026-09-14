import { prisma } from "./prisma";
import { HttpError } from "./guards";
import { cancelProviderSubscriptionNow, hasProviderSubscription } from "./subscription-provider";
import { getLocale } from "./get-locale";
import { t } from "./i18n";

export type OrganizationSummary = {
  organizationId: string;
  organizationName: string;
  ownerEmail: string | null;
  hasProviderSubscription: boolean;
  counts: {
    trips: number;
    expenses: number;
    invoices: number;
    trucks: number;
    drivers: number;
    clients: number;
    customFields: number;
    users: number;
  };
};

/**
 * Chiffres exacts de ce que la suppression du compte effacera — affichés
 * à l'admin avant qu'il confirme. Lus au moment de l'ouverture de la
 * confirmation (pas au rendu de la page admin, qui peut dater).
 */
export async function summarizeOrganization(organizationId: string): Promise<OrganizationSummary> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      users: { where: { role: "OWNER" }, take: 1, select: { email: true } },
      _count: { select: { trips: true, expenses: true, invoices: true, trucks: true, drivers: true, clients: true, customFields: true, users: true } },
    },
  });
  if (!org) throw new HttpError(404, t(getLocale(), "org_not_found_error"));
  return {
    organizationId: org.id,
    organizationName: org.name,
    ownerEmail: org.users[0]?.email ?? null,
    hasProviderSubscription: hasProviderSubscription(org),
    counts: org._count,
  };
}

/**
 * Supprime DÉFINITIVEMENT un compte propriétaire et tout ce qu'il contient,
 * en une seule transaction (tout ou rien) — jamais de résidu, y compris
 * pour une organisation déjà orpheline (utilisateur supprimé à la main
 * dans la base : rien à effacer côté User, le reste suit le même chemin).
 *
 * Ordre imposé par les clés étrangères entre les données de l'organisation
 * elle-même (chaque table est effacée AVANT celles qu'elle référence) :
 *   1. factures      → voyages, clients
 *   2. dépenses      → voyages, camions, chauffeurs, utilisateur créateur
 *   3. voyages       → camions, chauffeurs, clients, utilisateur créateur
 *   4. utilisateurs  → chauffeurs (User.driverId) ; propriétaire(s) et
 *                      comptes de connexion des chauffeurs de l'organisation
 *                      (jamais l'admin de la plateforme, qui n'a pas
 *                      d'organisation)
 *   5. chauffeurs    → camions
 *   6. camions, clients, colonnes personnalisées → organisation seulement
 *   7. codes de connexion en attente de l'email du propriétaire (EmailCode
 *      n'est lié que par l'adresse, pas par clé étrangère)
 *   8. demandes de contact : CONSERVÉES, seulement détachées
 *      (organizationId = null) — ce sont des demandes entrantes que l'admin
 *      peut vouloir garder pour son suivi après la suppression du compte
 *   9. l'organisation elle-même
 *
 * Toutes les suppressions sont filtrées par organizationId : aucune ligne
 * d'un autre compte ne peut être touchée. Si une donnée d'un AUTRE compte
 * référençait malgré tout une ligne effacée ici (impossible via
 * l'application, seulement par une modification manuelle en base), la
 * base refuserait (clé étrangère) et la transaction entière serait annulée.
 *
 * Un abonnement Stripe/PayPal encore porté par l'organisation est résilié
 * chez le prestataire AVANT de toucher à la base, et un refus du
 * prestataire annule la suppression (erreur 502, rien n'est effacé) : le
 * client ne doit jamais continuer à payer pour un compte qui n'existe plus.
 */
export async function deleteOrganizationCompletely(organizationId: string): Promise<OrganizationSummary["counts"]> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new HttpError(404, t(getLocale(), "org_not_found_error"));

  if (hasProviderSubscription(org)) {
    await cancelProviderSubscriptionNow(org, { failHard: true });
  }

  return prisma.$transaction(async (tx) => {
    const ownerEmails = (await tx.user.findMany({
      where: { organizationId, email: { not: null } },
      select: { email: true },
    })).map((u) => u.email as string);

    const invoices = await tx.invoice.deleteMany({ where: { organizationId } });
    const expenses = await tx.expense.deleteMany({ where: { organizationId } });
    const trips = await tx.trip.deleteMany({ where: { organizationId } });
    const users = await tx.user.deleteMany({
      where: {
        role: { not: "PLATFORM_ADMIN" },
        OR: [{ organizationId }, { driver: { organizationId } }],
      },
    });
    const drivers = await tx.driver.deleteMany({ where: { organizationId } });
    const trucks = await tx.truck.deleteMany({ where: { organizationId } });
    const clients = await tx.client.deleteMany({ where: { organizationId } });
    const customFields = await tx.customFieldDefinition.deleteMany({ where: { organizationId } });
    if (ownerEmails.length > 0) {
      await tx.emailCode.deleteMany({ where: { email: { in: ownerEmails } } });
    }
    await tx.contactRequest.updateMany({ where: { organizationId }, data: { organizationId: null } });
    await tx.organization.delete({ where: { id: organizationId } });

    return {
      trips: trips.count, expenses: expenses.count, invoices: invoices.count, trucks: trucks.count,
      drivers: drivers.count, clients: clients.count, customFields: customFields.count, users: users.count,
    };
  });
}
