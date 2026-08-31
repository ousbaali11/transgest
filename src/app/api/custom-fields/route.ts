import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

const createSchema = z.object({
  target: z.enum(["TRIP", "EXPENSE"]),
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER"]).default("TEXT"),
});

export async function GET() {
  try {
    const session = await requireOrgSession();
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
    const session = await requireOrgSession();
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
    const session = await requireOrgSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

    const field = await prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!field || field.organizationId !== session.organizationId) throw new HttpError(404, "Colonne introuvable");

    await prisma.customFieldDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
