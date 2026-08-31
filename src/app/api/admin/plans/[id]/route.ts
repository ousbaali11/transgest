import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const plan = await prisma.plan.update({ where: { id: params.id }, data: { visible: !!body.visible } });
    return NextResponse.json(plan);
  } catch (e) {
    return handleApiError(e);
  }
}
