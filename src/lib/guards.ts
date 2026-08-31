import { NextResponse } from "next/server";
import { getSession } from "./session";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** À appeler en tête de chaque route API réservée aux propriétaires/chauffeurs. */
export function requireOrgSession() {
  const session = getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) {
    throw new HttpError(401, "Non authentifié");
  }
  return session as { role: "OWNER" | "DRIVER"; userId: string; organizationId: string; phone: string };
}

/** À appeler en tête de chaque route API réservée à l'administrateur de la plateforme. */
export function requireAdminSession() {
  const session = getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    throw new HttpError(401, "Non authentifié");
  }
  return session as { role: "PLATFORM_ADMIN"; userId: string; email: string };
}

export function handleApiError(e: unknown) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
