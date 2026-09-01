import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import ColonnesManager from "./ColonnesManager";

export default async function ColonnesPage() {
  const { org } = await requireActiveOrg();
  const fields = await prisma.customFieldDefinition.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container">
      <ScreenHeader title="Colonnes personnalisées" backHref="/dashboard" />
      <p className="muted" style={{ marginBottom: 16 }}>
        Ajoutez des champs propres à votre activité (ex : n° de plomb, type de remorque). Ils apparaissent dans les
        formulaires de voyage/dépense et dans l'export Excel.
      </p>
      <ColonnesManager initialFields={JSON.parse(JSON.stringify(fields))} />
    </div>
  );
}
