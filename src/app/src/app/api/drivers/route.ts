import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";
import { generateAccessCode } from "@/lib/access-code";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  truckId: z.string().optional().nullable(),
  notes: z.string().optional(),
  isOwnerSelf: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireOrgSession();
    const drivers = await prisma.driver.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });
    // Un chauffeur ne voit jamais le code d'accès d'un collègue — seul le
    // propriétaire (qui gère leur attribution) doit pouvoir les consulter.
    const safeDrivers = session.role === "OWNER" ? drivers : drivers.map(({ accessCode: _accessCode, ...d }) => d);
    return NextResponse.json(safeDrivers);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    if (parsed.data.phone) {
      const existing = await prisma.driver.findUnique({ where: { phone: parsed.data.phone } });
      if (existing) throw new HttpError(409, "Ce numéro de téléphone est déjà utilisé par un autre chauffeur.");
    }

    // Le propriétaire qui s'ajoute lui-même comme chauffeur n'a pas besoin
    // d'un code de connexion séparé : il accède déjà à tout via son propre
    // compte propriétaire.
    const accessCode = parsed.data.isOwnerSelf ? null : generateAccessCode();

    const driver = await prisma.driver.create({
      data: { ...parsed.data, accessCode, organizationId: session.organizationId },
    });
    return NextResponse.json(driver, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
