"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { t, dateLocale, type Locale, type TKey } from "@/lib/i18n";
import CollapsibleCard from "@/components/CollapsibleCard";

type Row = {
  organizationId: string;
  organizationName: string;
  email: string;
  planLabel: string;
  status: string;
  grantedByAdmin: boolean;
  lockedByAdmin: boolean;
  currentPeriodEnd: string | Date | null;
  createdAt: string | Date;
  trips: number;
};
type Plan = { id: string; key: string; label: string };

// Récapitulatif chiffré renvoyé par GET /api/admin/organizations/[id]
// avant la suppression d'un compte.
type Summary = {
  organizationName: string;
  ownerEmail: string | null;
  hasProviderSubscription: boolean;
  counts: { trips: number; expenses: number; invoices: number; trucks: number; drivers: number; clients: number; customFields: number; users: number };
};
const SUMMARY_ITEMS: { key: keyof Summary["counts"]; label: TKey }[] = [
  { key: "trips", label: "delete_account_item_trips" },
  { key: "expenses", label: "delete_account_item_expenses" },
  { key: "invoices", label: "delete_account_item_invoices" },
  { key: "trucks", label: "delete_account_item_trucks" },
  { key: "drivers", label: "delete_account_item_drivers" },
  { key: "clients", label: "delete_account_item_clients" },
  { key: "customFields", label: "delete_account_item_custom_fields" },
  { key: "users", label: "delete_account_item_users" },
];

const DANGER = "#C0392B";

// PAST_DUE manquait : le badge "paiement en échec" héritait alors d'une
// couleur au hasard selon le contexte.
const STATUS_COLOR: Record<string, string> = { NONE: "#9CA3AF", ACTIVE: "#2E7D53", CANCELING: "#B5791C", PAST_DUE: "#C0392B", EXPIRED: "#C0392B" };

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
  const [lockBusyId, setLockBusyId] = useState<string | null>(null);
  const [lockError, setLockError] = useState("");

  // Suppression complète d'un compte : récapitulatif chiffré lu à
  // l'ouverture, puis confirmation par saisie du mot clé.
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [confirmWord, setConfirmWord] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteDone, setDeleteDone] = useState("");
  const keyword = t(locale, "delete_account_keyword");
  const confirmReady = confirmWord.trim().toUpperCase() === keyword.toUpperCase();

  async function toggleLock(organizationId: string, currentlyLocked: boolean) {
    setLockBusyId(organizationId);
    setLockError("");
    try {
      const res = await fetch("/api/admin/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, locked: !currentlyLocked }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setLockError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setLockError(t(locale, "server_unreachable_short"));
    } finally {
      setLockBusyId(null);
    }
  }

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

  async function openDelete(row: Row) {
    setDeleteTarget(row);
    setSummary(null);
    setConfirmWord("");
    setDeleteError("");
    setDeleteDone("");
    try {
      const res = await fetch(`/api/admin/organizations/${row.organizationId}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSummary(data);
      else setDeleteError(data.error || t(locale, "error_generic"));
    } catch {
      setDeleteError(t(locale, "server_unreachable_short"));
    }
  }

  function closeDelete() {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setSummary(null);
    setConfirmWord("");
  }

  async function confirmDelete() {
    if (!deleteTarget || !summary || !confirmReady) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/organizations/${deleteTarget.organizationId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        setSummary(null);
        setConfirmWord("");
        setDeleteDone(t(locale, "delete_account_done"));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setDeleteError(t(locale, "server_unreachable_short"));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <CollapsibleCard title={`${t(locale, "users_title")} (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>{t(locale, "no_accounts_yet")}</p>
      ) : (
        <div style={{ marginTop: 12, maxHeight: 420, overflowY: "auto" }}>
          {rows.map((r) => (
            <div key={r.organizationId} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.email}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.planLabel} · {r.trips} {t(locale, "trips_suffix")} · {t(locale, "created_on")} {fmtDate(r.createdAt, locale)}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#F1F1EF", color: STATUS_COLOR[r.status] }}>
                  {statusLabel(locale, r.status)}
                </span>
              </div>
              {r.lockedByAdmin && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#C0392B", marginTop: 4 }}>🔒 {t(locale, "account_locked_badge")}</div>
              )}
              {/* flexWrap : texte "offert jusqu'au…" + deux boutons ne tenaient pas sur 375px */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 6, flexWrap: "wrap" }}>
                {r.grantedByAdmin ? (
                  <span style={{ fontSize: 11, color: "var(--primary)" }}>
                    {t(locale, "offered_gift")}{r.currentPeriodEnd ? ` ${t(locale, "offered_until")} ${fmtDate(r.currentPeriodEnd, locale)}` : ` ${t(locale, "offered_unlimited")}`}
                  </span>
                ) : <span />}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    className="btn"
                    style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: r.lockedByAdmin ? "#2E7D53" : "#FBE9E7", color: r.lockedByAdmin ? "#fff" : "#C0392B" }}
                    disabled={lockBusyId === r.organizationId}
                    onClick={() => toggleLock(r.organizationId, r.lockedByAdmin)}
                  >
                    {lockBusyId === r.organizationId ? "…" : r.lockedByAdmin ? t(locale, "unlock_account") : t(locale, "lock_account")}
                  </button>
                  <button
                    className="btn"
                    style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: r.grantedByAdmin ? "var(--primary)" : "#F1F1EF", color: r.grantedByAdmin ? "#fff" : "var(--text)" }}
                    onClick={() => { setGrantTarget(r); setGrantError(""); }}
                  >
                    {r.grantedByAdmin ? t(locale, "modify_offer") : t(locale, "offer_subscription")}
                  </button>
                  {/* Action destructive : écartée des deux autres (marge
                      nette + contour rouge, seule action à porter une icône)
                      pour éviter un clic par erreur en voulant verrouiller ou
                      offrir. Une marge plutôt qu'un trait vertical : sur
                      375px le bouton passe à la ligne et un trait resterait
                      orphelin en bout de ligne. */}
                  <button
                    className="btn btn-danger"
                    style={{ width: "auto", padding: "4px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, borderColor: "#E9A8A1", marginInlineStart: 14 }}
                    onClick={() => openDelete(r)}
                  >
                    <Trash2 size={12} aria-hidden /> {t(locale, "delete_account")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {lockError && <p className="error-text" style={{ marginTop: 8 }}>{lockError}</p>}
      {deleteDone && <p style={{ marginTop: 8, fontSize: 13, color: "#2E7D53", fontWeight: 600 }}>{deleteDone}</p>}
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

      {deleteTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" style={{ position: "fixed", inset: 0, background: "rgba(15,20,30,0.45)", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={closeDelete}>
          {/* margin auto : centré sur grand écran (une feuille collée à gauche
              sur 1400px de large se lit mal), pleine largeur sur mobile */}
          <div className="container" style={{ background: "#fff", borderRadius: "16px 16px 0 0", margin: "0 auto", width: "100%", padding: 20, maxHeight: "92vh", overflowY: "auto", borderTop: `4px solid ${DANGER}` }} onClick={(e) => e.stopPropagation()}>
            <strong id="delete-account-title" style={{ color: DANGER, display: "flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={16} aria-hidden /> {t(locale, "delete_account_title")}
            </strong>
            <div style={{ marginTop: 6, fontWeight: 600 }}>{deleteTarget.email}</div>
            <div className="muted" style={{ fontSize: 12 }}>{deleteTarget.organizationName}</div>
            <p style={{ marginTop: 10, fontSize: 13, color: DANGER, fontWeight: 600 }}>{t(locale, "delete_account_warning")}</p>

            {!summary && !deleteError && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{t(locale, "loading")}</p>}
            {summary && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: "#FBE9E7", borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t(locale, "delete_account_summary_title")}</div>
                {!summary.ownerEmail && <div style={{ fontSize: 12, marginBottom: 4 }}>{t(locale, "delete_account_no_owner")}</div>}
                <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2px 12px" }}>
                  {SUMMARY_ITEMS.map((item) => (
                    <li key={item.key}><strong>{summary.counts[item.key]}</strong> {t(locale, item.label)}</li>
                  ))}
                </ul>
                {summary.hasProviderSubscription && (
                  <p style={{ fontSize: 12, marginTop: 8, fontWeight: 600 }}>{t(locale, "delete_account_subscription_note")}</p>
                )}
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{t(locale, "delete_account_contact_note")}</p>
              </div>
            )}

            {summary && (
              <label className="field" style={{ marginTop: 12 }}>
                <span className="field-label">{t(locale, "delete_account_type_word").replace("{word}", keyword)}</span>
                <input
                  type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false}
                  value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} placeholder={keyword}
                  disabled={deleteBusy}
                />
              </label>
            )}
            {deleteError && <p className="error-text" style={{ marginTop: 8 }}>{deleteError}</p>}
            <button
              className="btn"
              style={{ background: DANGER, color: "#fff", marginTop: 4 }}
              disabled={!summary || !confirmReady || deleteBusy}
              onClick={confirmDelete}
            >
              {deleteBusy ? t(locale, "loading") : t(locale, "delete_account_confirm")}
            </button>
            <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={deleteBusy} onClick={closeDelete}>
              {t(locale, "cancel")}
            </button>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
