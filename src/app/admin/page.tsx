import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import AdminUsersTable from "./AdminUsersTable";
import AdminSettingsPanel from "./AdminSettingsPanel";
import AdminContactRequests from "./AdminContactRequests";
import LandingHeader from "@/components/LandingHeader";
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
  const contactRequests = await prisma.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  const rows = organizations.map((org) => ({
    organizationId: org.id,
    organizationName: org.name,
    email: org.users[0]?.email || "—",
    planLabel: org.plan?.label || t(locale, "no_plan"),
    status: org.subscriptionStatus,
    grantedByAdmin: org.grantedByAdmin,
    lockedByAdmin: org.lockedByAdmin,
    currentPeriodEnd: org.currentPeriodEnd,
    createdAt: org.createdAt,
    trips: org._count.trips,
  }));

  return (
    <div className={settings.uiTheme === "advanced" ? "app-advanced" : ""} data-accent={settings.advancedAccent} style={{ minHeight: "100vh" }}>
      <LandingHeader appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} locale={locale} uiTheme={settings.uiTheme} advancedAccent={settings.advancedAccent} logoutRedirectTo="/admin/login" />
      <div className="container">
        <h1 style={{ fontSize: 20, margin: "20px 0" }}>{t(locale, "admin_dashboard_title")}</h1>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">{t(locale, "accounts_created")}</div>
            <div className="value">{rows.length}</div>
          </div>
        </div>

        <AdminUsersTable rows={JSON.parse(JSON.stringify(rows))} plans={plans} locale={locale} />
        <AdminContactRequests requests={JSON.parse(JSON.stringify(contactRequests))} locale={locale} />
        <AdminSettingsPanel initialSettings={JSON.parse(JSON.stringify(settings))} initialPlans={JSON.parse(JSON.stringify(plans))} locale={locale} />
      </div>
    </div>
  );
}

