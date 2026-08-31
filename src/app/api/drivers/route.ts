import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  truckId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = requireOrgSession();
    const drivers = await prisma.driver.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(drivers);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireOrgSession();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const driver = await prisma.driver.create({ data: { ...parsed.data, organizationId: session.organizationId } });
    return NextResponse.json(driver, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
