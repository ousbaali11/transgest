import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";

const createSchema = z.object({
  tripId: z.string().min(1),
  clientId: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session.organizationId);
    // Même cloisonnement que pour les voyages/dépenses : un chauffeur ne
    // voit que les factures liées à des voyages qu'il a lui-même saisis.
    const driverScope = session.role === "DRIVER" ? { trip: { OR: [{ driverId: session.driverId }, { createdByUserId: session.userId }] } } : {};
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: session.organizationId, ...driverScope },
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
    await assertOrgActive(session.organizationId);
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } });
    if (!trip || trip.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
    }
    // Même règle que pour modifier un voyage : un chauffeur ne peut générer
    // une facture que pour un voyage qu'il a lui-même saisi — sinon la
    // facture créée ne lui serait ensuite même plus visible (Factures est
    // filtré sur ce même critère), ce qui serait un comportement confus.
    if (session.role === "DRIVER" && trip.driverId !== session.driverId && trip.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
    }

    const count = await prisma.invoice.count({ where: { organizationId: session.organizationId } });
    const number = `${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: session.organizationId,
        tripId: parsed.data.tripId,
        clientId: parsed.data.clientId ?? trip.clientId,
        number,
        date: trip.date,
      },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
