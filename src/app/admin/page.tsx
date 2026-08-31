import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import AdminUsersTable from "./AdminUsersTable";
import AdminSettingsPanel from "./AdminSettingsPanel";
import LogoutButton from "../LogoutButton";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") redirect("/admin/login");

  const organizations = await prisma.organization.findMany({
    include: { users: { where: { role: "OWNER" }, take: 1 }, plan: true, _count: { select: { trips: true } } },
    orderBy: { createdAt: "desc" },
  });
  const settings = await prisma.platformSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  const plans = await prisma.plan.findMany();

  const rows = organizations.map((org) => ({
    organizationId: org.id,
    organizationName: org.name,
    phone: org.users[0]?.phone || "—",
    planLabel: org.plan?.label || "Sans formule",
    status: org.subscriptionStatus,
    grantedByAdmin: org.grantedByAdmin,
    currentPeriodEnd: org.currentPeriodEnd,
    trips: org._count.trips,
  }));

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0" }}>
        <h1 style={{ fontSize: 20 }}>Espace admin</h1>
        <LogoutButton redirectTo="/admin/login" />
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Comptes créés</div>
          <div className="value">{rows.length}</div>
        </div>
      </div>

      <AdminUsersTable rows={JSON.parse(JSON.stringify(rows))} plans={plans} />
      <AdminSettingsPanel initialSettings={JSON.parse(JSON.stringify(settings))} initialPlans={JSON.parse(JSON.stringify(plans))} />
    </div>
  );
}

