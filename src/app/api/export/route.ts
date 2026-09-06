import { NextResponse } from "next/server";
import { requireOrgSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { buildOrganizationWorkbook } from "@/lib/export-workbook";
import { getPlatformSettings } from "@/lib/settings";

export async function GET() {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session.organizationId);
    const settings = await getPlatformSettings();
    const buffer = await buildOrganizationWorkbook(session.organizationId, settings.appName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rapport-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
