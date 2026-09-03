import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError, HttpError } from "@/lib/guards";

export async function POST() {
  try {
    const session = await requireOwnerSession();
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (org?.grantedByAdmin) {
      throw new HttpError(400, "Cet abonnement a été offert par l'administrateur et ne peut pas être résilié ici.");
    }
    const updated = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date(), subscriptionStatus: "CANCELING" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
