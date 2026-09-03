import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import ClientsManager from "./ClientsManager";

export default async function ClientsPage() {
  const { org } = await requireActiveOrg();
  const locale = getLocale();
  const clients = await prisma.client.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="container">
      <ScreenHeader title={t(locale, "nav_clients")} backHref="/dashboard" />
      <ClientsManager initialClients={JSON.parse(JSON.stringify(clients))} locale={locale} />
    </div>
  );
}
