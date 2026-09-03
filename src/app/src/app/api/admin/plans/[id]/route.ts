import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";

const patchSchema = z.object({
  visible: z.boolean().optional(),
  priceMonthlyMAD: z.number().int().nonnegative().nullable().optional(),
  priceAnnualMAD: z.number().int().nonnegative().nullable().optional(),
  stripePriceIdMonthly: z.string().nullable().optional(),
  stripePriceIdAnnual: z.string().nullable().optional(),
  paypalPlanIdMonthly: z.string().nullable().optional(),
  paypalPlanIdAnnual: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    // priceMAD (prix "de référence", affiché à l'ancienne) suit le prix mensuel
    // quand celui-ci change, pour rester cohérent avec l'existant.
    const data: typeof parsed.data & { priceMAD?: number } = { ...parsed.data };
    if (typeof parsed.data.priceMonthlyMAD === "number") data.priceMAD = parsed.data.priceMonthlyMAD;

    const plan = await prisma.plan.update({ where: { id: params.id }, data });
    return NextResponse.json(plan);
  } catch (e) {
    return handleApiError(e);
  }
}
