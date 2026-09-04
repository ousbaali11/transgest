"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, dateLocale, type Locale } from "@/lib/i18n";

type Row = {
  organizationId: string;
  organizationName: string;
  email: string;
  planLabel: string;
  status: string;
  grantedByAdmin: boolean;
  currentPeriodEnd: string | Date | null;
  trips: number;
};
type Plan = { id: string; key: string; label: string };


const STATUS_COLOR: Record<string, string> = { NONE: "#9CA3AF", ACTIVE: "#2E7D53", CANCELING: "#B5791C", EXPIRED: "#C0392B" };

function fmtDate(d: string | Date | null, locale: Locale) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(dateLocale(locale));
}

function statusLabel(locale: Locale, status: string): string {
  const map: Record<string, string> = {
    NONE: t(locale, "status_none"), ACTIVE: t(locale, "status_active"),
    CANCELING: t(locale, "status_canceling"), PAST_DUE: t(locale, "status_past_due"), EXPIRED: t(locale, "status_expired"),
  };
  return map[status] || status;
}

export default function AdminUsersTable({ rows, plans, locale }: { rows: Row[]; plans: Plan[]; locale: Locale }) {
  const router = useRouter();
  const [grantTarget, setGrantTarget] = useState<Row | null>(null);
  const [planKey, setPlanKey] = useState(plans[plans.length - 1]?.key || plans[0]?.key || "");
  const [duration, setDuration] = useState("30");
  const [busy, setBusy] = useState(false);
  const [grantError, setGrantError] = useState("");

  async function saveGrant() {
    if (!grantTarget) return;
    setBusy(true);
    setGrantError("");
    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: grantTarget.organizationId,
          planKey,
          durationDays: duration === "unlimited" ? null : Number(duration),
        }),
      });
      if (res.ok) {
        setGrantTarget(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setGrantError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setGrantError(t(locale, "server_unreachable_short"));
    } finally {
      setBusy(false);
    }
  }

  async function revokeGrant(organizationId: string) {
    setBusy(true);
    setGrantError("");
    try {
      const res = await fetch(`/api/admin/grants?organizationId=${organizationId}`, { method: "DELETE" });
      if (res.ok) {
        setGrantTarget(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setGrantError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setGrantError(t(locale, "server_unreachable_short"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <strong>{t(locale, "users_title")}</strong>
      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>{t(locale, "no_accounts_yet")}</p>
      ) : (
        <div style={{ marginTop: 12, maxHeight: 420, overflowY: "auto" }}>
          {rows.map((r) => (
            <div key={r.organizationId} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.email}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{r.planLabel} · {r.trips} {t(locale, "trips_suffix")}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#F1F1EF", color: STATUS_COLOR[r.status] }}>
                  {statusLabel(locale, r.status)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                {r.grantedByAdmin ? (
                  <span style={{ fontSize: 11, color: "var(--primary)" }}>
                    {t(locale, "offered_gift")}{r.currentPeriodEnd ? ` ${t(locale, "offered_until")} ${fmtDate(r.currentPeriodEnd, locale)}` : ` ${t(locale, "offered_unlimited")}`}
                  </span>
                ) : <span />}
                <button
                  className="btn"
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: r.grantedByAdmin ? "var(--primary)" : "#F1F1EF", color: r.grantedByAdmin ? "#fff" : "var(--text)" }}
                  onClick={() => { setGrantTarget(r); setGrantError(""); }}
                >
                  {r.grantedByAdmin ? t(locale, "modify_offer") : t(locale, "offer_subscription")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        {t(locale, "admin_users_note")}
      </p>

      {grantTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,30,0.45)", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={() => setGrantTarget(null)}>
          <div className="container" style={{ background: "#fff", borderRadius: "16px 16px 0 0", margin: 0, width: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <strong>{t(locale, "offer_subscription_for")} {grantTarget.email}</strong>
            <label className="field" style={{ marginTop: 12 }}>
              <span className="field-label">{t(locale, "field_plan")}</span>
              <select value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
                {plans.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t(locale, "field_duration")}</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="30">{t(locale, "duration_30_days")}</option>
                <option value="90">{t(locale, "duration_90_days")}</option>
                <option value="365">{t(locale, "duration_1_year")}</option>
                <option value="unlimited">{t(locale, "duration_unlimited")}</option>
              </select>
            </label>
            {grantError && <p className="error-text" style={{ marginTop: 8 }}>{grantError}</p>}
            <button className="btn" disabled={busy} onClick={saveGrant}>{t(locale, "offer_this_subscription")}</button>
            {grantTarget.grantedByAdmin && (
              <button className="btn btn-danger" style={{ marginTop: 8 }} disabled={busy} onClick={() => revokeGrant(grantTarget.organizationId)}>
                {t(locale, "revoke_offered_subscription")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
