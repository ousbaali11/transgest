import { NextResponse } from "next/server";
import { requireOwnerSession, handleApiError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { buildOrganizationWorkbook } from "@/lib/export-workbook";
import { getPlatformSettings } from "@/lib/settings";

// Réservé au propriétaire : le rapport contient le détail (revenus,
// dépenses, bénéfice) de CHAQUE chauffeur — masqué dans le menu pour les
// chauffeurs, mais ça ne suffit pas en soi : sans requireOwnerSession() ici,
// n'importe quel chauffeur pourrait appeler cette route directement et
// télécharger les performances de toute l'équipe.
export async function GET() {
  try {
    const session = await requireOwnerSession();
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
