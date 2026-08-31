import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";

export async function GET() {
  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const plans = await prisma.plan.findMany();
    return NextResponse.json({ settings, plans });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAdminSession();
    const body = await req.json();
    const settings = await prisma.platformSettings.update({ where: { id: "singleton" }, data: body });
    return NextResponse.json(settings);
  } catch (e) {
    return handleApiError(e);
  }
}
