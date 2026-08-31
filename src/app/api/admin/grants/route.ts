import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  organizationId: z.string(),
  planKey: z.string(),
  durationDays: z.number().nullable(), // null = illimité
});

export async function POST(req: NextRequest) {
  try {
    requireAdminSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const { organizationId, planKey, durationDays } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) return NextResponse.json({ error: "Formule introuvable" }, { status: 404 });

    const currentPeriodEnd = durationDays
      ? new Date(Date.now() + durationDays * 86_400_000)
      : null;

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        planId: plan.id,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        grantedByAdmin: true,
      },
    });
    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAdminSession();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: "organizationId manquant" }, { status: 400 });

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: "NONE", grantedByAdmin: false, currentPeriodEnd: null, planId: null },
    });
    return NextResponse.json(org);
  } catch (e) {
    return handleApiError(e);
  }
}
