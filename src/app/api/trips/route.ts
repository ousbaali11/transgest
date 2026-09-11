import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { assertClientInOrg, assertDriverInOrg, assertTruckInOrg, driverScope } from "@/lib/org-refs";
import { tripSchema as createSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId") || undefined;

    // Un chauffeur ne reçoit que les voyages qui le concernent — cette route
    // renvoyait TOUS les voyages de l'organisation, alors que la page
    // Voyages, elle, filtrait : le cloisonnement n'existait que côté écran.
    const trips = await prisma.trip.findMany({
      where: { organizationId: session.organizationId, ...driverScope(session), ...(driverId ? { driverId } : {}) },
      include: { truck: true, driver: true, client: true, expenses: true, invoice: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(trips);
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

    // Un chauffeur ne peut créer un voyage que sous son propre nom : on
    // ignore toute autre valeur de driverId envoyée par le client.
    const driverId = session.role === "DRIVER" ? session.driverId : parsed.data.driverId;

    // Les identifiants liés doivent appartenir à CETTE organisation.
    await Promise.all([
      assertTruckInOrg(session.organizationId, parsed.data.truckId),
      assertDriverInOrg(session.organizationId, driverId),
      assertClientInOrg(session.organizationId, parsed.data.clientId),
    ]);

    const trip = await prisma.trip.create({
      data: {
        ...parsed.data,
        driverId,
        date: new Date(parsed.data.date),
        customFields: parsed.data.customFields || {},
        organizationId: session.organizationId,
        createdByUserId: session.userId,
      },
    });
    return NextResponse.json(trip, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
