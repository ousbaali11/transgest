import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import ClientsManager from "./ClientsManager";

export default async function ClientsPage() {
  const { org } = await requireActiveOrg();
  const clients = await prisma.client.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="container">
      <ScreenHeader title="Clients" backHref="/dashboard" />
      <ClientsManager initialClients={JSON.parse(JSON.stringify(clients))} />
    </div>
  );
}
