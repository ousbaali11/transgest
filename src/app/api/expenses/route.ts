import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";

const createSchema = z.object({
  tripId: z.string().optional().nullable(),
  truckId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  category: z.enum(["CARBURANT", "PEAGE", "AUTRES"]),
  date: z.string().datetime(),
  quantite: z.number().optional().nullable(),
  unite: z.string().optional(),
  prixUnitaire: z.number().optional().nullable(),
  montant: z.number(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = requireOrgSession();
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId") || undefined;

    const expenses = await prisma.expense.findMany({
      where: { organizationId: session.organizationId, ...(tripId ? { tripId } : {}) },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireOrgSession();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const expense = await prisma.expense.create({
      data: {
        ...parsed.data,
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
