import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import ColonnesManager from "./ColonnesManager";

export default async function ColonnesPage() {
  const { org } = await requireActiveOrg();
  const locale = getLocale();
  const fields = await prisma.customFieldDefinition.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container">
      <ScreenHeader title={t(locale, "nav_custom_fields")} backHref="/dashboard" />
      <p className="muted" style={{ marginBottom: 16 }}>
        {t(locale, "columns_intro")}
      </p>
      <ColonnesManager initialFields={JSON.parse(JSON.stringify(fields))} locale={locale} />
    </div>
  );
}
