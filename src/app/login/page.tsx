"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIAL_CODES } from "@/lib/currency";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [countryCode, setCountryCode] = useState("MA");
  const [customDial, setCustomDial] = useState("+");
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const isOther = countryCode === "OTHER";
  const dial = isOther ? customDial || "+" : DIAL_CODES[countryCode].dial;
  const fullPhone = `${dial}${national.replace(/\D/g, "").replace(/^0+/, "")}`;

  async function sendCode() {
    setError("");
    if (national.replace(/\D/g, "").length < 8) { setError("Numéro de téléphone invalide"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      let data: { error?: string; devCode?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("Réponse inattendue du serveur. Réessayez.");
        return;
      }
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setDevCode(data.devCode || null);
      setStep("otp");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code, countryCode }),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("Réponse inattendue du serveur. Réessayez.");
        return;
      }
      if (!res.ok) { setError(data.error || "Code incorrect"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div style={{ textAlign: "center", margin: "40px 0" }}>
        <span style={{ fontSize: 48 }}>🚛</span>
        <h1 style={{ fontSize: 22, marginTop: 12 }}>TransGest</h1>
        <p className="muted">Gestion de flotte poids lourds</p>
      </div>

      {step === "phone" ? (
        <>
          <label className="field">
            <span className="field-label">Pays</span>
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              {Object.entries(DIAL_CODES).map(([cc, c]) => (
                <option key={cc} value={cc}>{c.name} ({c.dial})</option>
              ))}
              <option value="OTHER">Autre (indicatif libre)</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Numéro de téléphone</span>
            <div style={{ display: "flex", gap: 8 }}>
              {isOther ? (
                <input style={{ width: 80, flexShrink: 0 }} value={customDial} onChange={(e) => setCustomDial(e.target.value)} placeholder="+000" />
              ) : (
                <div style={{ display: "flex", alignItems: "center", padding: "0 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#f6f4ef", flexShrink: 0 }}>{dial}</div>
              )}
              <input type="tel" value={national} onChange={(e) => setNational(e.target.value)} placeholder="6 12 34 56 78" />
            </div>
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={sendCode} disabled={busy || !national}>{busy ? "Envoi…" : "Recevoir le code"}</button>
        </>
      ) : (
        <>
          <p className="muted">Code envoyé au {fullPhone}.</p>
          {devCode && (
            <div className="card" style={{ background: "var(--primary-10)", border: "none" }}>
              <span style={{ fontSize: 13 }}>Mode développement — code : </span>
              <strong>{devCode}</strong>
            </div>
          )}
          <label className="field">
            <span className="field-label">Code de vérification</span>
            <input type="tel" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} onChange={(e) => setCode(e.target.value)} placeholder="0000" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={verify} disabled={busy || code.length < 4}>{busy ? "Vérification…" : "Vérifier"}</button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={sendCode} disabled={busy}>Renvoyer le code</button>
        </>
      )}

      <p style={{ textAlign: "center", marginTop: 32 }}>
        <a href="/admin/login" className="muted">Espace administrateur</a>
      </p>
    </div>
  );
}
