import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import AdminUsersTable from "./AdminUsersTable";
import AdminSettingsPanel from "./AdminSettingsPanel";
import LogoutButton from "../LogoutButton";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") redirect("/admin/login");
  const locale = getLocale();

  const organizations = await prisma.organization.findMany({
    include: { users: { where: { role: "OWNER" }, take: 1 }, plan: true, _count: { select: { trips: true } } },
    orderBy: { createdAt: "desc" },
  });
  const settings = await getPlatformSettings();
  const plans = await prisma.plan.findMany();

  const rows = organizations.map((org) => ({
    organizationId: org.id,
    organizationName: org.name,
    email: org.users[0]?.email || "—",
    planLabel: org.plan?.label || t(locale, "no_plan"),
    status: org.subscriptionStatus,
    grantedByAdmin: org.grantedByAdmin,
    currentPeriodEnd: org.currentPeriodEnd,
    trips: org._count.trips,
  }));

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0" }}>
        <h1 style={{ fontSize: 20 }}>{t(locale, "admin_dashboard_title")}</h1>
        <LogoutButton redirectTo="/admin/login" />
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">{t(locale, "accounts_created")}</div>
          <div className="value">{rows.length}</div>
        </div>
      </div>

      <AdminUsersTable rows={JSON.parse(JSON.stringify(rows))} plans={plans} locale={locale} />
      <AdminSettingsPanel initialSettings={JSON.parse(JSON.stringify(settings))} initialPlans={JSON.parse(JSON.stringify(plans))} locale={locale} />
    </div>
  );
}

