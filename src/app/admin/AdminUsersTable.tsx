"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const STATUS_LABEL: Record<string, string> = { NONE: "—", ACTIVE: "Actif", CANCELING: "Résilié", EXPIRED: "Expiré" };
const STATUS_COLOR: Record<string, string> = { NONE: "#9CA3AF", ACTIVE: "#2E7D53", CANCELING: "#B5791C", EXPIRED: "#C0392B" };

function fmtDate(d: string | Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR");
}

export default function AdminUsersTable({ rows, plans }: { rows: Row[]; plans: Plan[] }) {
  const router = useRouter();
  const [grantTarget, setGrantTarget] = useState<Row | null>(null);
  const [planKey, setPlanKey] = useState(plans[plans.length - 1]?.key || plans[0]?.key || "");
  const [duration, setDuration] = useState("30");
  const [busy, setBusy] = useState(false);

  async function saveGrant() {
    if (!grantTarget) return;
    setBusy(true);
    try {
      await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: grantTarget.organizationId,
          planKey,
          durationDays: duration === "unlimited" ? null : Number(duration),
        }),
      });
      setGrantTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revokeGrant(organizationId: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/grants?organizationId=${organizationId}`, { method: "DELETE" });
      setGrantTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <strong>Utilisateurs</strong>
      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>Aucun compte créé pour le moment.</p>
      ) : (
        <div style={{ marginTop: 12, maxHeight: 420, overflowY: "auto" }}>
          {rows.map((r) => (
            <div key={r.organizationId} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.email}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{r.planLabel} · {r.trips} voyage(s)</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#F1F1EF", color: STATUS_COLOR[r.status] }}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                {r.grantedByAdmin ? (
                  <span style={{ fontSize: 11, color: "var(--primary)" }}>
                    🎁 offert{r.currentPeriodEnd ? ` jusqu'au ${fmtDate(r.currentPeriodEnd)}` : " (illimité)"}
                  </span>
                ) : <span />}
                <button
                  className="btn"
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: r.grantedByAdmin ? "var(--primary)" : "#F1F1EF", color: r.grantedByAdmin ? "#fff" : "var(--text)" }}
                  onClick={() => setGrantTarget(r)}
                >
                  {r.grantedByAdmin ? "Modifier l'offre" : "Offrir un abonnement"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        Ces numéros sont protégés par la session admin et par les policies RLS côté base de données — contrairement au prototype, ils ne sont plus lisibles par n'importe quel visiteur.
      </p>

      {grantTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,30,0.45)", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={() => setGrantTarget(null)}>
          <div className="container" style={{ background: "#fff", borderRadius: "16px 16px 0 0", margin: 0, width: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <strong>Offrir un abonnement — {grantTarget.email}</strong>
            <label className="field" style={{ marginTop: 12 }}>
              <span className="field-label">Formule</span>
              <select value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
                {plans.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Durée</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="30">30 jours</option>
                <option value="90">90 jours</option>
                <option value="365">1 an</option>
                <option value="unlimited">Illimitée</option>
              </select>
            </label>
            <button className="btn" disabled={busy} onClick={saveGrant}>Offrir cet abonnement</button>
            {grantTarget.grantedByAdmin && (
              <button className="btn btn-danger" style={{ marginTop: 8 }} disabled={busy} onClick={() => revokeGrant(grantTarget.organizationId)}>
                Retirer l'abonnement offert
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
