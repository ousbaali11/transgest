"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Route, TrendingUp, Receipt, Download, Users, Smartphone } from "lucide-react";
import { formatAccessCode } from "@/lib/access-code";
import { t, type Locale } from "@/lib/i18n";
import LandingHeader from "@/components/LandingHeader";

type Role = "select" | "owner" | "driver";
type OwnerStep = "email" | "code";

const FEATURES = [
  { icon: Route, key: "landing_feature_trips" as const },
  { icon: TrendingUp, key: "landing_feature_profit" as const },
  { icon: Receipt, key: "landing_feature_invoices" as const },
  { icon: Download, key: "landing_feature_export" as const },
  { icon: Users, key: "landing_feature_drivers" as const },
  { icon: Smartphone, key: "landing_feature_devices" as const },
];

export default function LoginForm({ appName, logoEmoji, logoType, logoImage, locale }: { appName: string; logoEmoji: string; logoType: string; logoImage: string | null; locale: Locale }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("select");

  // --- Propriétaire : email + code ---
  const [ownerStep, setOwnerStep] = useState<OwnerStep>("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  // --- Chauffeur : code à 8 caractères ---
  const [driverCode, setDriverCode] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function goHome() {
    setRole("select");
    setOwnerStep("email");
    setEmail("");
    setEmailCode("");
    setDriverCode("");
    setError("");
  }

  async function sendEmailCode() {
    setError("");
    if (!email.includes("@")) { setError("Adresse email invalide"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      let data: { error?: string; code?: string; devCode?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("Réponse inattendue du serveur. Réessayez.");
        return;
      }
      if (!res.ok) {
        if (data.code === "ALREADY_SENT" && email === lastSentEmail) {
          setOwnerStep("code");
          return;
        }
        setError(data.error || "Erreur");
        return;
      }
      setLastSentEmail(email);
      setDevCode(data.devCode || null);
      setOwnerStep("code");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: emailCode }),
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

  function editEmail() {
    setOwnerStep("email");
    setEmailCode("");
    setError("");
  }

  async function driverLogin() {
    setError("");
    const cleaned = driverCode.replace(/\s+/g, "");
    if (cleaned.length !== 8) { setError("Le code doit contenir 8 caractères."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/driver-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleaned }),
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
    <div style={{ minHeight: "100vh" }}>
      <LandingHeader appName={appName} logoEmoji={logoEmoji} logoType={logoType} logoImage={logoImage} locale={locale} onHome={goHome} />

      <div className="container">
        {role === "select" && (
          <div style={{ textAlign: "center", margin: "36px 0 32px" }}>
            <h1 style={{ fontSize: 26, lineHeight: 1.25, marginBottom: 12 }}>{t(locale, "landing_headline")}</h1>
            <p className="muted" style={{ fontSize: 15, maxWidth: 440, margin: "0 auto" }}>{t(locale, "landing_subheadline")}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "28px 0", textAlign: "left" }}>
              {FEATURES.map((f) => (
                <div key={f.key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <f.icon size={14} color="var(--primary)" />
                  </div>
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>{t(locale, f.key)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {role !== "select" && (
          <div style={{ textAlign: "center", margin: "32px 0 28px" }}>
            <h1 style={{ fontSize: 20 }}>{appName}</h1>
          </div>
        )}

        <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          {role === "select" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn" onClick={() => setRole("owner")}>{t(locale, "login_owner")}</button>
              <button className="btn btn-ghost" onClick={() => setRole("driver")}>{t(locale, "login_driver")}</button>
            </div>
          )}

          {role === "owner" && ownerStep === "email" && (
            <>
              <label className="field">
                <span className="field-label">{t(locale, "login_email")}</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
              </label>
              {error && <p className="error-text">{error}</p>}
              <button className="btn" onClick={sendEmailCode} disabled={busy || !email}>{busy ? t(locale, "loading") : t(locale, "login_receive_code")}</button>
            </>
          )}

          {role === "owner" && ownerStep === "code" && (
            <>
              <p className="muted">
                Code envoyé à {email}.{" "}
                <button type="button" onClick={editEmail} style={{ background: "none", border: "none", padding: 0, color: "var(--primary)", fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}>
                  {t(locale, "edit")}
                </button>
              </p>
              {devCode && (
                <div className="card" style={{ background: "var(--primary-10)", border: "none" }}>
                  <span style={{ fontSize: 13 }}>Mode développement — code : </span>
                  <strong>{devCode}</strong>
                </div>
              )}
              <label className="field">
                <span className="field-label">Code de vérification</span>
                <input type="tel" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="0000" />
              </label>
              {error && <p className="error-text">{error}</p>}
              <button className="btn" onClick={verifyEmailCode} disabled={busy || emailCode.length < 4}>{busy ? t(locale, "loading") : t(locale, "login_verify")}</button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={sendEmailCode} disabled={busy}>{t(locale, "login_resend")}</button>
            </>
          )}

          {role === "driver" && (
            <>
              <label className="field">
                <span className="field-label">{t(locale, "login_driver_code")}</span>
                <input
                  type="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  value={driverCode}
                  onChange={(e) => setDriverCode(formatAccessCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)))}
                  placeholder="Ab3D 5fG8"
                  style={{ letterSpacing: 2, fontSize: 18, textAlign: "center" }}
                />
              </label>
              <p className="muted" style={{ fontSize: 13 }}>{t(locale, "login_driver_hint")}</p>
              {error && <p className="error-text">{error}</p>}
              <button className="btn" onClick={driverLogin} disabled={busy || driverCode.replace(/\s+/g, "").length !== 8}>
                {busy ? t(locale, "loading") : t(locale, "login_connect")}
              </button>
            </>
          )}
        </div>

        {role === "select" && (
          <p style={{ textAlign: "center", marginTop: 32 }}>
            <a href="/admin/login" className="muted">{t(locale, "login_admin_area")}</a>
          </p>
        )}
      </div>
    </div>
  );
}
