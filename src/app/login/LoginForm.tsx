"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAccessCode } from "@/lib/access-code";
import { t, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Role = "select" | "owner" | "driver";
type OwnerStep = "email" | "code";

export default function LoginForm({ appName, logoEmoji, logoType, logoImage, locale }: { appName: string; logoEmoji: string; logoType: string; logoImage: string | null; locale: Locale }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("select");

  // --- Propriétaire : email + code ---
  const [ownerStep, setOwnerStep] = useState<OwnerStep>("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  // --- Chauffeur : code à 16 chiffres ---
  const [driverCode, setDriverCode] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function backToSelect() {
    setRole("select");
    setOwnerStep("email");
    setError("");
    setDriverCode("");
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
    if (cleaned.length !== 16) { setError("Le code doit contenir 16 chiffres."); return; }
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
    <div className="container">
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
        <div style={{ background: "var(--primary)", borderRadius: 999 }}>
          <LanguageSwitcher current={locale} />
        </div>
      </div>

      <div style={{ textAlign: "center", margin: "24px 0 40px" }}>
        {logoType === "image" && logoImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoImage} alt={appName} style={{ width: 56, height: 56, objectFit: "contain", margin: "0 auto" }} />
        ) : (
          <span style={{ fontSize: 48 }}>{logoEmoji}</span>
        )}
        <h1 style={{ fontSize: 22, marginTop: 12 }}>{appName}</h1>
        <p className="muted">Gestion de flotte poids lourds</p>
      </div>

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
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={backToSelect}>← {t(locale, "back")}</button>
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
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              value={driverCode}
              onChange={(e) => setDriverCode(formatAccessCode(e.target.value.replace(/\D/g, "").slice(0, 16)))}
              placeholder="0000 0000 0000 0000"
              style={{ letterSpacing: 2, fontSize: 18, textAlign: "center" }}
            />
          </label>
          <p className="muted" style={{ fontSize: 13 }}>{t(locale, "login_driver_hint")}</p>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={driverLogin} disabled={busy || driverCode.replace(/\s+/g, "").length !== 16}>
            {busy ? t(locale, "loading") : t(locale, "login_connect")}
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={backToSelect}>← {t(locale, "back")}</button>
        </>
      )}

      {role === "select" && (
        <p style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/admin/login" className="muted">{t(locale, "login_admin_area")}</a>
        </p>
      )}
    </div>
  );
}
