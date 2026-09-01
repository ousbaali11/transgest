import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requireOwnerSession, handleApiError } from "@/lib/guards";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("Professionnel"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireOrgSession();
    const clients = await prisma.client.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clients);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const client = await prisma.client.create({ data: { ...parsed.data, organizationId: session.organizationId } });
    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
