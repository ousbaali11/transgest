import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_ATTEMPTS = 5;
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
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const { email, password } = parsed.data;
    const ip = getClientIp(req);

    if (ip !== "unknown") {
      const recentFailures = await prisma.adminLoginAttempt.count({
        where: { ip, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
      });
      if (recentFailures >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
      }
    }

    const admin = await prisma.user.findFirst({
      where: { role: "PLATFORM_ADMIN", email: email.toLowerCase() },
    });

    if (!admin || !admin.passwordHash || !(await bcrypt.compare(password, admin.passwordHash))) {
      if (ip !== "unknown") await prisma.adminLoginAttempt.create({ data: { ip } });
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const token = await signSession({ role: "PLATFORM_ADMIN", userId: admin.id, email: admin.email! });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
