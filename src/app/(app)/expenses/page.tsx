import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { driverScope } from "@/lib/org-refs";
import ExpensesManager from "./ExpensesManager";

export default async function ExpensesPage() {
  const { org, session } = await requireActiveOrg();
  const currentDriverId = session.role === "DRIVER" ? session.driverId : null;
  const locale = getLocale();
  const scope = driverScope(session);
  const [expenses, trucks, drivers, trips, customFields] = await Promise.all([
    prisma.expense.findMany({
      where: { organizationId: org.id, ...scope },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
    prisma.driver.findMany({ where: { organizationId: org.id } }),
    // La liste "voyage lié" proposée à un chauffeur ne contient que SES
    // voyages — elle affichait les trajets de toute l'entreprise.
    prisma.trip.findMany({ where: { organizationId: org.id, ...scope }, orderBy: { date: "desc" }, take: 50 }),
    prisma.customFieldDefinition.findMany({ where: { organizationId: org.id, target: "EXPENSE" } }),
  ]);

  return (
    <div className="container pm-expenses">
      <ScreenHeader title={t(locale, "nav_expenses")} />
      <ExpensesManager
        initialExpenses={JSON.parse(JSON.stringify(expenses))}
        trucks={JSON.parse(JSON.stringify(trucks))}
        drivers={JSON.parse(JSON.stringify(drivers))}
        trips={JSON.parse(JSON.stringify(trips))}
        customFields={JSON.parse(JSON.stringify(customFields))}
        currentDriverId={currentDriverId}
        currentUserId={session.userId}
        locale={locale}
      />
    </div>
  );
}
