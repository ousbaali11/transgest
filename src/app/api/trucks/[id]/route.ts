import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { truckSchema as createSchema } from "@/lib/schemas";

async function assertOwnership(organizationId: string, id: string) {
  const truck = await prisma.truck.findUnique({ where: { id } });
  if (!truck || truck.organizationId !== organizationId) {
    throw new HttpError(404, t(getLocale(), "truck_not_found_error"));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    await assertOwnership(session.organizationId, params.id);
    const parsed = createSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const truck = await prisma.truck.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(truck);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    await assertOwnership(session.organizationId, params.id);
    await prisma.truck.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
