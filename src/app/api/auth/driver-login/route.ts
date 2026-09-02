import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  code: z.string().min(16).max(20), // tolère les espaces de mise en forme, nettoyés ci-dessous
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }
    const code = parsed.data.code.replace(/\s+/g, "");
    if (code.length !== 16) {
      return NextResponse.json({ error: "Le code doit contenir 16 chiffres." }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({ where: { accessCode: code } });
    if (!driver) {
      return NextResponse.json({ error: "Code incorrect. Vérifiez auprès du propriétaire de la flotte." }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { driverId: driver.id } });
    if (!user) {
      user = await prisma.user.create({ data: { role: "DRIVER", organizationId: driver.organizationId, driverId: driver.id } });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "Compte sans organisation associée" }, { status: 500 });
    }

    const token = await signSession({
      role: "DRIVER", userId: user.id, organizationId: user.organizationId, driverId: driver.id, driverName: driver.name,
    });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
