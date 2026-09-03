import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import ExpensesManager from "./ExpensesManager";

export default async function ExpensesPage() {
  const { org, session } = await requireActiveOrg();
  const currentDriverId = session.role === "DRIVER" ? session.driverId : null;
  const [expenses, trucks, drivers, trips, customFields] = await Promise.all([
    prisma.expense.findMany({ where: { organizationId: org.id }, orderBy: { date: "desc" }, take: 100 }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
    prisma.driver.findMany({ where: { organizationId: org.id } }),
    prisma.trip.findMany({ where: { organizationId: org.id }, orderBy: { date: "desc" }, take: 50 }),
    prisma.customFieldDefinition.findMany({ where: { organizationId: org.id, target: "EXPENSE" } }),
  ]);

  return (
    <div className="container">
      <ScreenHeader title="Dépenses" />
      <ExpensesManager
        initialExpenses={JSON.parse(JSON.stringify(expenses))}
        trucks={JSON.parse(JSON.stringify(trucks))}
        drivers={JSON.parse(JSON.stringify(drivers))}
        trips={JSON.parse(JSON.stringify(trips))}
        customFields={JSON.parse(JSON.stringify(customFields))}
        currentDriverId={currentDriverId}
        currentUserId={session.userId}
      />
    </div>
  );
}
