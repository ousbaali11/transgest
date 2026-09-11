import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { assertClientInOrg, driverScope, nextInvoiceNumber, tripConcernsSession } from "@/lib/org-refs";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const createSchema = z.object({
  tripId: z.string().min(1),
  clientId: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    // Même cloisonnement que pour les voyages/dépenses : un chauffeur ne
    // voit que les factures liées à des voyages qui le concernent.
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: session.organizationId, ...(session.role === "DRIVER" ? { trip: driverScope(session) } : {}) },
      include: { trip: true, client: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } });
    if (!trip || trip.organizationId !== session.organizationId) {
      return NextResponse.json({ error: t(getLocale(), "trip_not_found_error") }, { status: 404 });
    }
    // Même règle que pour voir un voyage : un chauffeur ne peut générer une
    // facture que pour un voyage qui le concerne — sinon la facture créée
    // ne lui serait ensuite même plus visible (Factures est filtré sur ce
    // même critère), ce qui serait un comportement confus.
    if (!tripConcernsSession(session, trip)) {
      return NextResponse.json({ error: t(getLocale(), "trip_not_found_error") }, { status: 404 });
    }
    // Le client explicitement fourni doit appartenir à l'organisation (sans
    // ça, une facture pouvait être rattachée au client d'un autre compte).
    await assertClientInOrg(session.organizationId, parsed.data.clientId);

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: session.organizationId,
        tripId: parsed.data.tripId,
        clientId: parsed.data.clientId ?? trip.clientId,
        number: await nextInvoiceNumber(session.organizationId),
        date: trip.date,
      },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

// GET sans paramètre de requête : Next.js tenterait sinon de le pré-rendre
// statiquement au build et journalise une erreur "DYNAMIC_SERVER_USAGE"
// (lecture du cookie de session). Toujours exécuté à la demande.
export const dynamic = "force-dynamic";
