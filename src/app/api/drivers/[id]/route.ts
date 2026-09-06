import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";

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
  if (!driver || driver.organizationId !== organizationId) throw new HttpError(404, "Chauffeur introuvable");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session.organizationId);
    await assertOwnership(session.organizationId, params.id);
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    if (parsed.data.phone) {
      const existing = await prisma.driver.findUnique({ where: { phone: parsed.data.phone } });
      if (existing && existing.id !== params.id) throw new HttpError(409, "Ce numéro de téléphone est déjà utilisé par un autre chauffeur.");
    }
    const driver = await prisma.driver.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(driver);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session.organizationId);
    await assertOwnership(session.organizationId, params.id);
    await prisma.driver.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
