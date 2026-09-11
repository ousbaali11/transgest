"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import CollapsibleCard from "@/components/CollapsibleCard";
import AdminActionCodeGate from "@/components/AdminActionCodeGate";

type Plan = {
  id: string; key: string; label: string; priceMAD: number; visible: boolean;
  priceMonthlyMAD: number | null; priceAnnualMAD: number | null;
  stripePriceIdMonthly: string | null; stripePriceIdAnnual: string | null;
  paypalPlanIdMonthly: string | null; paypalPlanIdAnnual: string | null;
};

/**
 * Contenu "Abonnements" du panneau admin — extrait de AdminSettingsPanel
 * pour rester dans son propre fichier (formules, prix, identifiants de
 * paiement) et protégé par un code de vérification envoyé à l'email de
 * contact avant de pouvoir consulter ou modifier quoi que ce soit ici.
 */
export default function AdminSubscriptionsPanel({
  initialPlans, forcedPlanId, onForcedPlanChange, contactEmailConfigured, locale,
}: {
  initialPlans: Plan[]; forcedPlanId: string | null; onForcedPlanChange: (planId: string | null) => void;
  contactEmailConfigured: boolean; locale: Locale;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<Partial<Plan>>({});
  const [planSaveMsg, setPlanSaveMsg] = useState("");

  async function togglePlanVisible(plan: Plan) {
    setError("");
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !plan.visible }),
      });
      if (res.ok) setPlans(plans.map((p) => (p.id === plan.id ? { ...p, visible: !p.visible } : p)));
      else setError(t(locale, "error_generic"));
    } catch {
      setError(t(locale, "server_unreachable_short"));
    }
  }

  function startEditPlan(plan: Plan) {
    setEditingPlanId(plan.id);
    setPlanDraft({ ...plan });
    setPlanSaveMsg("");
  }

  async function savePlanDraft() {
    if (!editingPlanId) return;
    setBusy(true);
    setPlanSaveMsg("");
    try {
      const res = await fetch(`/api/admin/plans/${editingPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceMonthlyMAD: planDraft.priceMonthlyMAD === null || planDraft.priceMonthlyMAD === undefined ? null : Number(planDraft.priceMonthlyMAD),
          priceAnnualMAD: planDraft.priceAnnualMAD === null || planDraft.priceAnnualMAD === undefined ? null : Number(planDraft.priceAnnualMAD),
          stripePriceIdMonthly: planDraft.stripePriceIdMonthly || null,
          stripePriceIdAnnual: planDraft.stripePriceIdAnnual || null,
          paypalPlanIdMonthly: planDraft.paypalPlanIdMonthly || null,
          paypalPlanIdAnnual: planDraft.paypalPlanIdAnnual || null,
        }),
      });
      const updated = await res.json().catch(() => ({}));
      if (res.ok) {
        setPlans(plans.map((p) => (p.id === editingPlanId ? updated : p)));
        setEditingPlanId(null);
      } else {
        setPlanSaveMsg(updated.error || t(locale, "save_error"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapsibleCard title={t(locale, "subscriptions_title")}>
      <AdminActionCodeGate purpose="VIEW_SUBSCRIPTIONS" contactEmailConfigured={contactEmailConfigured} locale={locale}>
        {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}
        {plans.map((p) => (
          <div key={p.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.label} {p.priceMAD ? `— ${p.priceMAD} DH/${t(locale, "per_month")}` : `— ${t(locale, "free_label")}`}</div>
                <div className="muted" style={{ fontSize: 12 }}>{t(locale, "visible_label")} : {p.visible ? t(locale, "yes_label") : t(locale, "no_label")} {forcedPlanId === p.id && `· ${t(locale, "forced_for_all")}`}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn" style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: "#F1F1EF", color: "var(--text)" }} onClick={() => togglePlanVisible(p)}>
                  {p.visible ? t(locale, "hide") : t(locale, "show_action")}
                </button>
                <button
                  className="btn"
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: forcedPlanId === p.id ? "var(--primary)" : "#F1F1EF", color: forcedPlanId === p.id ? "#fff" : "var(--text)" }}
                  onClick={() => onForcedPlanChange(forcedPlanId === p.id ? null : p.id)}
                >
                  {forcedPlanId === p.id ? t(locale, "active_label") : t(locale, "activate_for_all")}
                </button>
              </div>
            </div>

            {p.priceMAD > 0 && (
              editingPlanId === p.id ? (
                <div style={{ marginTop: 10, background: "#F6F4EF", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">{t(locale, "monthly_price_mad")}</span>
                      <input type="number" value={planDraft.priceMonthlyMAD ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, priceMonthlyMAD: e.target.value ? Number(e.target.value) : null })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">{t(locale, "annual_price_mad")}</span>
                      <input type="number" value={planDraft.priceAnnualMAD ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, priceAnnualMAD: e.target.value ? Number(e.target.value) : null })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">{t(locale, "stripe_price_monthly")}</span>
                      <input placeholder="price_..." value={planDraft.stripePriceIdMonthly ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, stripePriceIdMonthly: e.target.value })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">{t(locale, "stripe_price_annual")}</span>
                      <input placeholder="price_..." value={planDraft.stripePriceIdAnnual ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, stripePriceIdAnnual: e.target.value })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">{t(locale, "paypal_plan_monthly")}</span>
                      <input placeholder="P-..." value={planDraft.paypalPlanIdMonthly ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, paypalPlanIdMonthly: e.target.value })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">{t(locale, "paypal_plan_annual")}</span>
                      <input placeholder="P-..." value={planDraft.paypalPlanIdAnnual ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, paypalPlanIdAnnual: e.target.value })} />
                    </label>
                  </div>
                  {planSaveMsg && <p className="error-text" style={{ marginBottom: 8 }}>{planSaveMsg}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setEditingPlanId(null)}>{t(locale, "cancel")}</button>
                    <button className="btn" disabled={busy} onClick={savePlanDraft}>{busy ? "…" : t(locale, "save")}</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => startEditPlan(p)} className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", marginTop: 6, padding: 0 }}>
                  {t(locale, "configure_payment")}
                </button>
              )
            )}
          </div>
        ))}
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          {t(locale, "hide_free_note")}
        </p>
      </AdminActionCodeGate>
    </CollapsibleCard>
  );
}
