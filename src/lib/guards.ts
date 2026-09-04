import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession, SessionPayload } from "./session";
import { getLocale } from "./get-locale";
import { t } from "./i18n";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** À appeler en tête de chaque route API réservée aux propriétaires/chauffeurs (lecture, ou écriture de leurs propres voyages/dépenses). */
export async function requireOrgSession() {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) {
    throw new HttpError(401, "Non authentifié");
  }
  return session as Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>;
}

/**
 * À appeler en tête de chaque route API réservée exclusivement au
 * propriétaire (gestion de la flotte, des clients, des colonnes
 * personnalisées, de l'abonnement...). Un chauffeur connecté reçoit une
 * erreur 403, pas seulement 401, pour bien distinguer "non connecté" de
 * "connecté mais pas autorisé".
 */
export async function requireOwnerSession() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    throw new HttpError(session?.role === "DRIVER" ? 403 : 401, session?.role === "DRIVER" ? "Réservé au propriétaire" : "Non authentifié");
  }
  return session as Extract<SessionPayload, { role: "OWNER" }>;
}

/** À appeler en tête de chaque route API réservée à l'administrateur de la plateforme. */
export async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    throw new HttpError(401, "Non authentifié");
  }
  return session as Extract<SessionPayload, { role: "PLATFORM_ADMIN" }>;
}

export function handleApiError(e: unknown) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  // Erreurs Prisma connues : messages compréhensibles plutôt qu'un générique
  // "Erreur serveur" qui n'aide personne à comprendre ce qui a coincé.
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const locale = getLocale();
    if (e.code === "P2003") {
      return NextResponse.json({ error: t(locale, "delete_conflict_error") }, { status: 409 });
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: t(locale, "not_found_error") }, { status: 404 });
    }
    if (e.code === "P2002") {
      return NextResponse.json({ error: t(locale, "duplicate_value_error") }, { status: 409 });
    }
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
