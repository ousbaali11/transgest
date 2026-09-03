"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Settings = { appName: string; logoEmoji: string; logoType: string; logoImage?: string | null; logoSize?: number; themePrimary: string; themeAccent: string; forcedPlanId: string | null; stripeEnabled: boolean; paypalEnabled: boolean };
type Plan = {
  id: string; key: string; label: string; priceMAD: number; visible: boolean;
  priceMonthlyMAD: number | null; priceAnnualMAD: number | null;
  stripePriceIdMonthly: string | null; stripePriceIdAnnual: string | null;
  paypalPlanIdMonthly: string | null; paypalPlanIdAnnual: string | null;
};

const PRESETS = [
  { primary: "#16305B", accent: "#E8892E", name: "Route" },
  { primary: "#1B4332", accent: "#D9A441", name: "Forêt" },
  { primary: "#3A1E5C", accent: "#E85D75", name: "Nuit" },
  { primary: "#7A2E2E", accent: "#E8B74B", name: "Brique" },
  { primary: "#0F2C4C", accent: "#3AAED8", name: "Océan" },
];

export default function AdminSettingsPanel({ initialSettings, initialPlans }: { initialSettings: Settings; initialPlans: Plan[] }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [plans, setPlans] = useState(initialPlans);
  const [busy, setBusy] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [logoMsg, setLogoMsg] = useState("");

  async function saveSettings(patch: Partial<Settings>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (res.ok) { setSettings({ ...settings, ...patch }); router.refresh(); }
    } finally {
      setBusy(false);
    }
  }

  async function togglePlanVisible(plan: Plan) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !plan.visible }),
    });
    if (res.ok) setPlans(plans.map((p) => (p.id === plan.id ? { ...p, visible: !p.visible } : p)));
  }

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<Partial<Plan>>({});
  const [planSaveMsg, setPlanSaveMsg] = useState("");

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
      const updated = await res.json();
      if (res.ok) {
        setPlans(plans.map((p) => (p.id === editingPlanId ? updated : p)));
        setEditingPlanId(null);
      } else {
        setPlanSaveMsg(updated.error || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setBusy(false);
    }
  }

  function onLogoFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 900 * 1024) { setLogoMsg("Image trop lourde — choisissez un fichier de moins de 900 Ko."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      saveSettings({ logoType: "image", logoImage: dataUrl } as Partial<Settings>);
      setLogoMsg("Logo mis à jour.");
    };
    reader.readAsDataURL(file);
  }

  function adjustLogoSize(delta: number) {
    const next = Math.max(24, Math.min(96, (settings.logoSize || 40) + delta));
    saveSettings({ logoSize: next } as Partial<Settings>);
  }

  async function changePassword() {
    setPwdMsg("");
    const res = await fetch("/api/auth/admin-change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) { setPwdMsg("Mot de passe mis à jour."); setCurPwd(""); setNewPwd(""); }
    else setPwdMsg(data.error || "Erreur");
  }

  return (
    <>
      <div className="card">
        <strong>Marque</strong>
        <label className="field" style={{ marginTop: 10 }}>
          <span className="field-label">Nom de l'application</span>
          <input value={settings.appName} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} />
        </label>

        <span className="field-label" style={{ display: "block", marginBottom: 8 }}>Logo</span>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 12 }}>
          {(["emoji", "image"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => saveSettings({ logoType: v } as Partial<Settings>)}
              style={{ flex: 1, padding: 8, border: "none", cursor: "pointer", background: settings.logoType === v ? "var(--primary)" : "#fff", color: settings.logoType === v ? "#fff" : "var(--text)" }}
            >
              {v === "emoji" ? "Icône" : "Image"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: 10, border: "1px solid var(--line)", background: "#F6F4EF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {settings.logoType === "image" && settings.logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoImage} alt="Logo" style={{ width: settings.logoSize || 40, height: settings.logoSize || 40, objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: settings.logoSize || 40, lineHeight: 1 }}>{settings.logoEmoji}</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {settings.logoType === "emoji" ? (
              <input maxLength={2} value={settings.logoEmoji} onChange={(e) => setSettings({ ...settings, logoEmoji: e.target.value })} placeholder="🚛" />
            ) : (
              <>
                <input type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0])} style={{ fontSize: 12 }} />
                {logoMsg && <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>{logoMsg}</p>}
              </>
            )}
          </div>
        </div>

        <span className="field-label" style={{ display: "block", marginBottom: 8 }}>Dimensions du logo ({settings.logoSize || 40}px)</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => adjustLogoSize(-8)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>−</button>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--line)", position: "relative" }}>
            <div style={{ height: 6, borderRadius: 999, background: "var(--primary)", width: `${(((settings.logoSize || 40) - 24) / (96 - 24)) * 100}%` }} />
          </div>
          <button type="button" onClick={() => adjustLogoSize(8)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>+</button>
        </div>

        <button className="btn" disabled={busy} onClick={() => saveSettings({ appName: settings.appName, logoEmoji: settings.logoEmoji })}>
          Enregistrer la marque
        </button>
      </div>

      <div className="card">
        <strong>Thème</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => saveSettings({ themePrimary: p.primary, themeAccent: p.accent })}
              title={p.name}
              style={{ width: 36, height: 36, borderRadius: 999, background: p.primary, border: settings.themePrimary === p.primary ? `2px solid ${p.accent}` : "2px solid transparent", cursor: "pointer" }}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <strong>Abonnements</strong>
        {plans.map((p) => (
          <div key={p.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.label} {p.priceMAD ? `— ${p.priceMAD} DH/mois` : "— gratuit"}</div>
                <div className="muted" style={{ fontSize: 12 }}>Visible : {p.visible ? "Oui" : "Non"} {settings.forcedPlanId === p.id && "· Forcé pour tous"}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: "#F1F1EF", color: "var(--text)" }} onClick={() => togglePlanVisible(p)}>
                  {p.visible ? "Masquer" : "Afficher"}
                </button>
                <button
                  className="btn"
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11, background: settings.forcedPlanId === p.id ? "var(--primary)" : "#F1F1EF", color: settings.forcedPlanId === p.id ? "#fff" : "var(--text)" }}
                  onClick={() => saveSettings({ forcedPlanId: settings.forcedPlanId === p.id ? null : p.id })}
                >
                  {settings.forcedPlanId === p.id ? "Actif" : "Activer pour tous"}
                </button>
              </div>
            </div>

            {p.priceMAD > 0 && (
              editingPlanId === p.id ? (
                <div style={{ marginTop: 10, background: "#F6F4EF", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">Prix mensuel (MAD)</span>
                      <input type="number" value={planDraft.priceMonthlyMAD ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, priceMonthlyMAD: e.target.value ? Number(e.target.value) : null })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">Prix annuel (MAD)</span>
                      <input type="number" value={planDraft.priceAnnualMAD ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, priceAnnualMAD: e.target.value ? Number(e.target.value) : null })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">Stripe — Price ID mensuel</span>
                      <input placeholder="price_..." value={planDraft.stripePriceIdMonthly ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, stripePriceIdMonthly: e.target.value })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">Stripe — Price ID annuel</span>
                      <input placeholder="price_..." value={planDraft.stripePriceIdAnnual ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, stripePriceIdAnnual: e.target.value })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">PayPal — Plan ID mensuel</span>
                      <input placeholder="P-..." value={planDraft.paypalPlanIdMonthly ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, paypalPlanIdMonthly: e.target.value })} />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">PayPal — Plan ID annuel</span>
                      <input placeholder="P-..." value={planDraft.paypalPlanIdAnnual ?? ""} onChange={(e) => setPlanDraft({ ...planDraft, paypalPlanIdAnnual: e.target.value })} />
                    </label>
                  </div>
                  {planSaveMsg && <p className="error-text" style={{ marginBottom: 8 }}>{planSaveMsg}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setEditingPlanId(null)}>Annuler</button>
                    <button className="btn" disabled={busy} onClick={savePlanDraft}>{busy ? "…" : "Enregistrer"}</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => startEditPlan(p)} className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", marginTop: 6, padding: 0 }}>
                  Configurer les prix et identifiants de paiement
                </button>
              )
            )}
          </div>
        ))}
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Masquer la formule Gratuite et activer « Pro » pour tous rend l'abonnement payant obligatoire pour tout nouvel utilisateur.
        </p>
      </div>

      <div className="card">
        <strong>Moyens de paiement</strong>
        <p className="muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 10 }}>
          Choisissez ce qui est proposé aux utilisateurs sur l&apos;écran d&apos;abonnement. Configurez
          d&apos;abord les identifiants dans <code>.env</code> (voir README) avant d&apos;activer.
        </p>
        {([
          { key: "stripeEnabled" as const, label: "Paiement par carte (Stripe)" },
          { key: "paypalEnabled" as const, label: "PayPal" },
        ]).map((m) => (
          <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 8 }}>
            <span style={{ fontSize: 14 }}>{m.label}</span>
            <button
              className="btn"
              style={{ width: "auto", padding: "4px 12px", fontSize: 12, background: settings[m.key] ? "#2E7D53" : "#F1F1EF", color: settings[m.key] ? "#fff" : "var(--text)" }}
              onClick={() => saveSettings({ [m.key]: !settings[m.key] } as Partial<Settings>)}
            >
              {settings[m.key] ? "Activé" : "Désactivé"}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <strong>Sécurité — changer le mot de passe</strong>
        <label className="field" style={{ marginTop: 10 }}>
          <span className="field-label">Mot de passe actuel</span>
          <div style={{ position: "relative" }}>
            <input type={showCurPwd ? "text" : "password"} autoComplete="current-password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowCurPwd((v) => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}>
              {showCurPwd ? "Masquer" : "Afficher"}
            </button>
          </div>
        </label>
        <label className="field">
          <span className="field-label">Nouveau mot de passe</span>
          <div style={{ position: "relative" }}>
            <input type={showNewPwd ? "text" : "password"} autoComplete="new-password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowNewPwd((v) => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}>
              {showNewPwd ? "Masquer" : "Afficher"}
            </button>
          </div>
        </label>
        <button className="btn" disabled={!curPwd || !newPwd} onClick={changePassword}>Mettre à jour le mot de passe</button>
        {pwdMsg && <p className={pwdMsg.startsWith("Mot de passe mis") ? "muted" : "error-text"} style={{ marginTop: 8 }}>{pwdMsg}</p>}
      </div>
    </>
  );
}
