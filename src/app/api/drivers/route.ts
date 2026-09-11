import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { generateAccessCode } from "@/lib/access-code";
import { assertTruckInOrg } from "@/lib/org-refs";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  truckId: z.string().optional().nullable(),
  notes: z.string().optional(),
  isOwnerSelf: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    const drivers = await prisma.driver.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(drivers);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    if (parsed.data.phone) {
      const existing = await prisma.driver.findUnique({ where: { phone: parsed.data.phone } });
      if (existing) throw new HttpError(409, t(getLocale(), "phone_already_used_error"));
    }
    // Le camion assigné doit appartenir à cette organisation.
    await assertTruckInOrg(session.organizationId, parsed.data.truckId);

    // Un seul profil "moi-même" par organisation — le second serait un
    // doublon sans code de connexion, impossible à distinguer du premier.
    if (parsed.data.isOwnerSelf) {
      const already = await prisma.driver.findFirst({ where: { organizationId: session.organizationId, isOwnerSelf: true } });
      if (already) return NextResponse.json(already, { status: 200 });
    }

    // Le propriétaire qui s'ajoute lui-même comme chauffeur n'a pas besoin
    // d'un code de connexion séparé : il accède déjà à tout via son propre
    // compte propriétaire.
    const accessCode = parsed.data.isOwnerSelf ? null : generateAccessCode();

    const driver = await prisma.driver.create({
      data: { ...parsed.data, phone: parsed.data.phone || null, accessCode, organizationId: session.organizationId },
    });
    return NextResponse.json(driver, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

// GET sans paramètre de requête : Next.js tenterait sinon de le pré-rendre
// statiquement au build et journalise une erreur "DYNAMIC_SERVER_USAGE"
// (lecture du cookie de session). Toujours exécuté à la demande.
export const dynamic = "force-dynamic";
