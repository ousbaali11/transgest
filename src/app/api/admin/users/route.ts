import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";

export async function GET() {
  try {
    requireAdminSession();
    const organizations = await prisma.organization.findMany({
      include: {
        users: { where: { role: "OWNER" }, take: 1 },
        plan: true,
        _count: { select: { trips: true, trucks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = organizations.map((org) => ({
      organizationId: org.id,
      organizationName: org.name,
      phone: org.users[0]?.phone || null,
      plan: org.plan?.label || null,
      status: org.subscriptionStatus,
      grantedByAdmin: org.grantedByAdmin,
      currentPeriodEnd: org.currentPeriodEnd,
      trips: org._count.trips,
      trucks: org._count.trucks,
      createdAt: org.createdAt,
    }));

    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}
