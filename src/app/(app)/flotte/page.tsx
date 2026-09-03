import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import FlotteManager from "./FlotteManager";

export default async function FlottePage() {
  const { org } = await requireActiveOrg();
  const locale = getLocale();
  const [trucks, drivers] = await Promise.all([
    prisma.truck.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } }),
    prisma.driver.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  const driversPlain = drivers.map((d) => ({
    id: d.id, name: d.name, phone: d.phone, truckId: d.truckId,
    accessCode: d.accessCode, isOwnerSelf: d.isOwnerSelf,
  }));

  return (
    <div className="container">
      <ScreenHeader title={t(locale, "nav_fleet")} backHref="/dashboard" />
      <FlotteManager
        initialTrucks={JSON.parse(JSON.stringify(trucks))}
        initialDrivers={JSON.parse(JSON.stringify(driversPlain))}
        locale={locale}
      />
    </div>
  );
}
