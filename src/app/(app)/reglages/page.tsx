import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import SubscriptionActions from "./SubscriptionActions";
import { Truck, Users, Package, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

function fmtDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR");
}

export default async function ReglagesPage() {
  const { org, session } = await requireActiveOrg();
  const isOwner = session.role === "OWNER";
  const locale = getLocale();
  const plan = org.planId ? await prisma.plan.findUnique({ where: { id: org.planId } }) : null;

  return (
    <div className="container">
      <ScreenHeader title={t(locale, "nav_settings")} backHref="/dashboard" />

      {isOwner ? (
        <div className="card">
          <strong>{t(locale, "my_subscription")}</strong>
          <div style={{ background: "var(--primary-10)", borderRadius: 8, padding: 12, margin: "10px 0" }}>
            <div style={{ fontWeight: 700, color: "var(--primary)" }}>{plan?.label || "—"}</div>
            <div style={{ fontSize: 13 }}>
              {org.grantedByAdmin
                ? `${t(locale, "offered_by_admin")}${org.currentPeriodEnd ? ` — ${t(locale, "until")} ${fmtDate(org.currentPeriodEnd)}` : ` — ${t(locale, "unlimited_access")}`}`
                : org.cancelAtPeriodEnd
                ? `${t(locale, "cancelled_access_until")} ${fmtDate(org.currentPeriodEnd)}`
                : `${t(locale, "renewal_on")} ${fmtDate(org.currentPeriodEnd)}`}
            </div>
          </div>
          {org.grantedByAdmin ? (
            <p className="muted">{t(locale, "offered_cannot_cancel")}</p>
          ) : (
            <SubscriptionActions cancelAtPeriodEnd={org.cancelAtPeriodEnd} locale={locale} />
          )}
        </div>
      ) : (
        <div className="card">
          <strong>{t(locale, "driver_account_title")}</strong>
          <p className="muted" style={{ marginTop: 8 }}>
            {t(locale, "driver_account_desc")}
          </p>
        </div>
      )}

      {isOwner && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {[
            { href: "/flotte", label: t(locale, "nav_fleet"), icon: Truck },
            { href: "/clients", label: t(locale, "nav_clients"), icon: Users },
            { href: "/colonnes", label: t(locale, "nav_custom_fields"), icon: Package },
          ].map((it) => (
            <Link
              key={it.href}
              href={it.href}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, textDecoration: "none", color: "var(--text)" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500 }}>
                <it.icon size={16} color="var(--primary)" /> {it.label}
              </span>
              <ChevronRight size={16} color="#9CA3AF" />
            </Link>
          ))}
        </div>
      )}

      <div className="card">
        <strong>{t(locale, "account_label")}</strong>
        <div className="muted">{isOwner ? session.email : `${session.driverName} · ${t(locale, "field_driver")}`}</div>
      </div>
    </div>
  );
}
