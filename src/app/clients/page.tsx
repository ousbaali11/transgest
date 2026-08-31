import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ClientsManager from "./ClientsManager";

export default async function ClientsPage() {
  const { org } = await requireActiveOrg();
  const clients = await prisma.client.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Clients</h1>
      <ClientsManager initialClients={JSON.parse(JSON.stringify(clients))} />
    </div>
  );
}
