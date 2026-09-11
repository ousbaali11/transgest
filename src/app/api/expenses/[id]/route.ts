import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { assertDriverInOrg, assertTripUsableBy, assertTruckInOrg } from "@/lib/org-refs";
import type { SessionPayload } from "@/lib/session";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { expenseSchema as createSchema } from "@/lib/schemas";

async function assertAccess(session: Extract<SessionPayload, { role: "OWNER" | "DRIVER" }>, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.organizationId !== session.organizationId) throw new HttpError(404, t(getLocale(), "expense_not_found_error"));
  if (session.role === "DRIVER" && expense.createdByUserId !== session.userId) {
    throw new HttpError(403, t(getLocale(), "expense_edit_own_only_error"));
  }
  return expense;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    await assertAccess(session, params.id);
    const parsed = createSchema.partial().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const data: Omit<typeof parsed.data, "date"> & { date?: Date } = { ...parsed.data, date: undefined };
    if (parsed.data.date) data.date = new Date(parsed.data.date);
    if (session.role === "DRIVER") data.driverId = session.driverId;

    await Promise.all([
      assertTripUsableBy(session, data.tripId),
      assertTruckInOrg(session.organizationId, data.truckId),
      assertDriverInOrg(session.organizationId, data.driverId),
    ]);

    const expense = await prisma.expense.update({ where: { id: params.id }, data });
    return NextResponse.json(expense);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    await assertAccess(session, params.id);
    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
