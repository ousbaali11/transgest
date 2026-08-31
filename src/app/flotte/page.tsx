import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import FlotteManager from "./FlotteManager";

export default async function FlottePage() {
  const { org } = await requireActiveOrg();
  const [trucks, drivers] = await Promise.all([
    prisma.truck.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } }),
    prisma.driver.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Camions & chauffeurs</h1>
      <FlotteManager
        initialTrucks={JSON.parse(JSON.stringify(trucks))}
        initialDrivers={JSON.parse(JSON.stringify(drivers))}
      />
    </div>
  );
}
