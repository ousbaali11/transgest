import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const createSchema = z.object({
  target: z.enum(["TRIP", "EXPENSE"]),
  label: z.string().min(1).max(80),
  type: z.enum(["TEXT", "NUMBER"]).default("TEXT"),
});

export async function GET() {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    const fields = await prisma.customFieldDefinition.findMany({
      where: { organizationId: session.organizationId },
    });
    return NextResponse.json(fields);
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
    const field = await prisma.customFieldDefinition.create({
      data: { ...parsed.data, organizationId: session.organizationId },
    });
    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    const locale = getLocale();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: t(locale, "missing_id_error") }, { status: 400 });

    const field = await prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!field || field.organizationId !== session.organizationId) throw new HttpError(404, t(locale, "column_not_found_error"));

    await prisma.customFieldDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

// GET sans paramètre de requête : Next.js tenterait sinon de le pré-rendre
// statiquement au build et journalise une erreur "DYNAMIC_SERVER_USAGE"
// (lecture du cookie de session). Toujours exécuté à la demande.
export const dynamic = "force-dynamic";
