import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ExpensesManager from "./ExpensesManager";

export default async function ExpensesPage() {
  const { org } = await requireActiveOrg();
  const [expenses, trucks, drivers, trips, customFields] = await Promise.all([
    prisma.expense.findMany({ where: { organizationId: org.id }, orderBy: { date: "desc" }, take: 100 }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
    prisma.driver.findMany({ where: { organizationId: org.id } }),
    prisma.trip.findMany({ where: { organizationId: org.id }, orderBy: { date: "desc" }, take: 50 }),
    prisma.customFieldDefinition.findMany({ where: { organizationId: org.id, target: "EXPENSE" } }),
  ]);

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Dépenses</h1>
      <ExpensesManager
        initialExpenses={JSON.parse(JSON.stringify(expenses))}
        trucks={JSON.parse(JSON.stringify(trucks))}
        drivers={JSON.parse(JSON.stringify(drivers))}
        trips={JSON.parse(JSON.stringify(trips))}
        customFields={JSON.parse(JSON.stringify(customFields))}
      />
    </div>
  );
}
