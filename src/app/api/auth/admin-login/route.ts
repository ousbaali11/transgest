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

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const admin = await prisma.user.findFirst({
      where: { role: "PLATFORM_ADMIN", email: email.toLowerCase() },
    });

    if (!admin || !admin.passwordHash || !(await bcrypt.compare(password, admin.passwordHash))) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const token = await signSession({ role: "PLATFORM_ADMIN", userId: admin.id, email: admin.email! });
    setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
