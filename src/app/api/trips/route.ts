import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";

const createSchema = z.object({
  truckId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  date: z.string().datetime(),
  depart: z.string().min(1),
  arrivee: z.string().min(1),
  kmDepart: z.number().optional().nullable(),
  kmArrivee: z.number().optional().nullable(),
  marchandise: z.string().optional(),
  quantite: z.number().optional().nullable(),
  unite: z.string().optional(),
  prixTransport: z.number().default(0),
  avance: z.number().default(0),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrgSession();
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId") || undefined;

    const trips = await prisma.trip.findMany({
      where: { organizationId: session.organizationId, ...(driverId ? { driverId } : {}) },
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
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    // Un chauffeur ne peut créer un voyage que sous son propre nom : on
    // ignore toute autre valeur de driverId envoyée par le client.
    const driverId = session.role === "DRIVER" ? session.driverId : parsed.data.driverId;

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
