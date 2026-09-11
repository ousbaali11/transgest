import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { clientSchema as createSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const session = await requireOwnerSession();
    await assertOrgActive(session);
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
    await assertOrgActive(session);
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const client = await prisma.client.create({ data: { ...parsed.data, organizationId: session.organizationId } });
    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

// GET sans paramètre de requête : Next.js tenterait sinon de le pré-rendre
// statiquement au build et journalise une erreur "DYNAMIC_SERVER_USAGE"
// (lecture du cookie de session). Toujours exécuté à la demande.
export const dynamic = "force-dynamic";
