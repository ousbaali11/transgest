import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";

const createSchema = z.object({
  immat: z.string().min(1),
  marque: z.string().optional(),
  modele: z.string().optional(),
  capacite: z.string().optional(),
  assuranceExpiry: z.string().datetime().optional().nullable(),
  visiteTechniqueExpiry: z.string().datetime().optional().nullable(),
  vignetteExpiry: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireOrgSession();
    const trucks = await prisma.truck.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(trucks);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrgSession();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const truck = await prisma.truck.create({
      data: { ...parsed.data, organizationId: session.organizationId },
    });
    return NextResponse.json(truck, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
