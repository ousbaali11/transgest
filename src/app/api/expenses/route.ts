import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { assertDriverInOrg, assertTripUsableBy, assertTruckInOrg, driverScope } from "@/lib/org-refs";
import { expenseSchema as createSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId") || undefined;

    // Même cloisonnement que la page Dépenses : un chauffeur ne reçoit que
    // les dépenses qui le concernent (cette route renvoyait tout).
    const expenses = await prisma.expense.findMany({
      where: { organizationId: session.organizationId, ...driverScope(session), ...(tripId ? { tripId } : {}) },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
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

    const driverId = session.role === "DRIVER" ? session.driverId : parsed.data.driverId;

    await Promise.all([
      assertTripUsableBy(session, parsed.data.tripId),
      assertTruckInOrg(session.organizationId, parsed.data.truckId),
      assertDriverInOrg(session.organizationId, driverId),
    ]);

    const expense = await prisma.expense.create({
      data: {
        ...parsed.data,
        driverId,
        date: new Date(parsed.data.date),
        customFields: parsed.data.customFields || {},
        organizationId: session.organizationId,
        createdByUserId: session.userId,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
