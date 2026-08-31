import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";

const patchSchema = z.object({ status: z.enum(["EN_ATTENTE", "PAYEE"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireOrgSession();
    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!invoice || invoice.organizationId !== session.organizationId) {
      throw new HttpError(404, "Facture introuvable");
    }
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const updated = await prisma.invoice.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
