import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import FlotteManager from "./FlotteManager";

export default async function FlottePage() {
  const { org } = await requireActiveOrg();
  const [trucks, drivers] = await Promise.all([
    prisma.truck.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } }),
    prisma.driver.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  const driversPlain = drivers.map((d) => ({
    id: d.id, name: d.name, phone: d.phone, truckId: d.truckId,
    accountActive: !!d.user,
  }));

  return (
    <div className="container">
      <ScreenHeader title="Camions & chauffeurs" backHref="/dashboard" />
      <FlotteManager
        initialTrucks={JSON.parse(JSON.stringify(trucks))}
        initialDrivers={JSON.parse(JSON.stringify(driversPlain))}
      />
    </div>
  );
}
