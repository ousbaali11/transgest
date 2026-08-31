import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOtpSms } from "@/lib/sms";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
});

function genOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
  }
  const { phone } = parsed.data;

  // Anti-spam simple : on ignore les demandes répétées de moins de 30s pour ce numéro.
  const recent = await prisma.otpCode.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - 30_000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return NextResponse.json({ error: "Un code a déjà été envoyé, patientez quelques secondes." }, { status: 429 });
  }

  const code = genOtp();
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + 5 * 60_000) },
  });

  await sendOtpSms(phone, code);

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, devCode: isDev ? code : undefined });
}
