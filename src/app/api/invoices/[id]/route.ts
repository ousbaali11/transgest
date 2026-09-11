import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const patchSchema = z.object({ status: z.enum(["EN_ATTENTE", "PAYEE"]) });

// Réservé au propriétaire : confirmer qu'une facture est payée est une
// décision financière, pas quelque chose qu'un chauffeur devrait pouvoir
// faire — y compris pour les factures de ses propres voyages.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!invoice || invoice.organizationId !== session.organizationId) {
      throw new HttpError(404, t(getLocale(), "invoice_not_found_error"));
    }
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const updated = await prisma.invoice.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
