import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";
import { hashAccessCode } from "@/lib/auth";
import { handleApiError } from "@/lib/guards";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

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
      return NextResponse.json({ error: t(getLocale(), "invalid_code_error") }, { status: 400 });
    }
    const code = parsed.data.code.replace(/\s+/g, "");
    if (code.length !== 8) {
      return NextResponse.json({ error: t(getLocale(), "driver_code_length_error") }, { status: 400 });
    }
    const ip = getClientIp(req);

    if (ip !== "unknown") {
      const recentFailures = await prisma.driverLoginAttempt.count({
        where: { ip, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
      });
      if (recentFailures >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: t(getLocale(), "too_many_attempts_error") }, { status: 429 });
      }
    }

    const driver = await prisma.driver.findUnique({ where: { accessCode: code } });
    if (!driver || !driver.accessCode) {
      if (ip !== "unknown") await prisma.driverLoginAttempt.create({ data: { ip } });
      return NextResponse.json({ error: t(getLocale(), "driver_incorrect_code_error") }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { driverId: driver.id } });
    if (!user) {
      user = await prisma.user.create({ data: { role: "DRIVER", organizationId: driver.organizationId, driverId: driver.id } });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: t(getLocale(), "driver_no_org_error") }, { status: 500 });
    }

    const token = await signSession({
      role: "DRIVER", userId: user.id, organizationId: user.organizationId, driverId: driver.id, driverName: driver.name,
      // Empreinte du code utilisé : régénérer le code invalide cette session
      // à la requête suivante (voir getValidSession).
      codeHash: hashAccessCode(driver.accessCode),
    });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
