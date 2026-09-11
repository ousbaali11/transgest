import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { assertTruckInOrg } from "@/lib/org-refs";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

// Volontairement distinct du schéma de création : isOwnerSelf ne doit
// jamais être modifiable après coup, et accessCode ne doit être régénéré
// que via /api/drivers/[id]/regenerate-code — jamais par cette route
// générique, où un champ non prévu serait sinon appliqué tel quel.
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  truckId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function assertOwnership(organizationId: string, id: string) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver || driver.organizationId !== organizationId) throw new HttpError(404, t(getLocale(), "driver_not_found_error"));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    await assertOwnership(session.organizationId, params.id);
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    if (parsed.data.phone) {
      const existing = await prisma.driver.findUnique({ where: { phone: parsed.data.phone } });
      if (existing && existing.id !== params.id) throw new HttpError(409, t(getLocale(), "phone_already_used_error"));
    }
    await assertTruckInOrg(session.organizationId, parsed.data.truckId);
    const driver = await prisma.driver.update({
      where: { id: params.id },
      // "" (champ vidé) doit devenir null, pas rester une chaîne vide — le
      // numéro est unique en base et deux chaînes vides entreraient en conflit.
      data: { ...parsed.data, phone: parsed.data.phone === "" ? null : parsed.data.phone },
    });
    return NextResponse.json(driver);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    await assertOwnership(session.organizationId, params.id);
    // Le compte de connexion (User) créé à la première connexion du
    // chauffeur pointe vers ce profil : sans le détacher d'abord, la
    // suppression échouait systématiquement (clé étrangère) dès que le
    // chauffeur s'était connecté une fois. Détaché, ce compte devient
    // orphelin et sa session est immédiatement refusée (voir
    // getValidSession) ; l'historique des voyages qu'il a saisis reste
    // attribué correctement. Les voyages/dépenses encore assignés à ce
    // chauffeur bloquent volontairement la suppression (409) : les
    // réassigner d'abord, plutôt que de perdre silencieusement à qui ils
    // appartenaient.
    await prisma.$transaction([
      prisma.user.updateMany({ where: { driverId: params.id }, data: { driverId: null } }),
      prisma.driver.delete({ where: { id: params.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
