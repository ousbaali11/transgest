"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Settings = { appName: string; logoEmoji: string; logoType: string; themePrimary: string; themeAccent: string; forcedPlanId: string | null };
type Plan = { id: string; key: string; label: string; priceMAD: number; visible: boolean };

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
  const [pwdMsg, setPwdMsg] = useState("");

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
        <label className="field">
          <span className="field-label">Logo (emoji)</span>
          <input maxLength={2} value={settings.logoEmoji} onChange={(e) => setSettings({ ...settings, logoEmoji: e.target.value })} />
        </label>
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
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 8 }}>
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
        ))}
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Masquer la formule Gratuite et activer « Pro » pour tous rend l'abonnement payant obligatoire pour tout nouvel utilisateur.
        </p>
      </div>

      <div className="card">
        <strong>Sécurité — changer le mot de passe</strong>
        <label className="field" style={{ marginTop: 10 }}>
          <span className="field-label">Mot de passe actuel</span>
          <input type="password" autoComplete="current-password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Nouveau mot de passe</span>
          <input type="password" autoComplete="new-password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        </label>
        <button className="btn" disabled={!curPwd || !newPwd} onClick={changePassword}>Mettre à jour le mot de passe</button>
        {pwdMsg && <p className={pwdMsg.startsWith("Mot de passe mis") ? "muted" : "error-text"} style={{ marginTop: 8 }}>{pwdMsg}</p>}
      </div>
    </>
  );
}
