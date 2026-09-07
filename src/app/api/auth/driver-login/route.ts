import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  code: z.string().min(8).max(12), // tolère les espaces de mise en forme, nettoyés ci-dessous
});

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }
    const code = parsed.data.code.replace(/\s+/g, "");
    if (code.length !== 8) {
      return NextResponse.json({ error: "Le code doit contenir 8 caractères." }, { status: 400 });
    }
    const ip = getClientIp(req);

    if (ip !== "unknown") {
      const recentFailures = await prisma.driverLoginAttempt.count({
        where: { ip, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
      });
      if (recentFailures >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
      }
    }

    const driver = await prisma.driver.findUnique({ where: { accessCode: code } });
    if (!driver) {
      if (ip !== "unknown") await prisma.driverLoginAttempt.create({ data: { ip } });
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
