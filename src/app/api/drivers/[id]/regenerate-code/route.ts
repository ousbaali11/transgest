import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { generateAccessCode } from "@/lib/access-code";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

/**
 * Génère un nouveau code de connexion pour ce chauffeur. L'ancien code est
 * invalidé immédiatement — y compris les sessions déjà ouvertes avec lui,
 * puisque chaque requête d'un chauffeur revérifie l'empreinte du code
 * (voir getValidSession dans lib/auth.ts).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    const locale = getLocale();
    const driver = await prisma.driver.findUnique({ where: { id: params.id } });
    if (!driver || driver.organizationId !== session.organizationId) throw new HttpError(404, t(locale, "driver_not_found_error"));
    if (driver.isOwnerSelf) throw new HttpError(400, t(locale, "owner_self_no_code_error"));

    const updated = await prisma.driver.update({ where: { id: params.id }, data: { accessCode: generateAccessCode() } });
    return NextResponse.json({ accessCode: updated.accessCode });
  } catch (e) {
    return handleApiError(e);
  }
}
