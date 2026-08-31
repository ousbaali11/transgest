import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/guards";

export async function POST() {
  try {
    const session = await requireOrgSession();
    const updated = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { cancelAtPeriodEnd: false, canceledAt: null, subscriptionStatus: "ACTIVE" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
