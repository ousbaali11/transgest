"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type Mode = "login" | "forgot-request" | "forgot-reset";

export default function AdminLoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // --- Connexion ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- Mot de passe oublié ---
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(t(locale, "unexpected_server_response"));
        return;
      }
      if (!res.ok) { setError(data.error || t(locale, "error_generic")); return; }
      router.push("/admin");
      router.refresh();
    } catch {
      setError(t(locale, "server_unreachable"));
    } finally {
      setBusy(false);
    }
  }

  function goToForgot() {
    setMode("forgot-request");
    setError("");
    setSuccessMsg("");
  }

  function backToLogin() {
    setMode("login");
    setError("");
    setSuccessMsg("");
    setResetCode("");
    setNewPassword("");
    setDevCode(null);
  }

  async function requestResetCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t(locale, "error_generic")); return; }
      setDevCode(data.devCode || null);
      setMode("forgot-reset");
    } catch {
      setError(t(locale, "server_unreachable"));
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t(locale, "error_generic")); return; }
      setSuccessMsg(t(locale, "password_reset_success"));
      setMode("login");
      setPassword("");
      setResetCode("");
      setNewPassword("");
    } catch {
      setError(t(locale, "server_unreachable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, marginTop: 40, marginBottom: 4 }}>
        {mode === "login" ? t(locale, "admin_area_title") : t(locale, "forgot_password_title")}
      </h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        {mode === "login" ? t(locale, "admin_area_desc") : t(locale, "forgot_password_desc")}
      </p>

      {mode === "login" && (
        <>
          <label className="field">
            <span className="field-label">{t(locale, "login_email")}</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@transgest.ma" />
          </label>
          <label className="field">
            <span className="field-label">{t(locale, "password_field")}</span>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}
              >
                {showPassword ? t(locale, "hide") : t(locale, "show_action")}
              </button>
            </div>
          </label>
          {successMsg && <p className="muted" style={{ color: "#2E7D53" }}>{successMsg}</p>}
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={submit} disabled={busy || !email || !password}>{busy ? t(locale, "loading") : t(locale, "login_connect")}</button>

          <p style={{ textAlign: "center", marginTop: 12 }}>
            <button type="button" onClick={goToForgot} style={{ background: "none", border: "none", padding: 0, color: "var(--primary)", fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
              {t(locale, "forgot_password_link")}
            </button>
          </p>
        </>
      )}

      {mode === "forgot-request" && (
        <>
          <label className="field">
            <span className="field-label">{t(locale, "login_email")}</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@transgest.ma" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={requestResetCode} disabled={busy || !email}>{busy ? t(locale, "loading") : t(locale, "login_receive_code")}</button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={backToLogin}>{t(locale, "back_to_login")}</button>
        </>
      )}

      {mode === "forgot-reset" && (
        <>
          <p className="muted">{t(locale, "forgot_password_sent_desc")}</p>
          {devCode && (
            <div className="card" style={{ background: "var(--primary-10)", border: "none" }}>
              <span style={{ fontSize: 13 }}>Mode développement — code : </span>
              <strong>{devCode}</strong>
            </div>
          )}
          <label className="field">
            <span className="field-label">{t(locale, "login_email")}</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Code de vérification</span>
            <input type="tel" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="0000" />
          </label>
          <label className="field">
            <span className="field-label">{t(locale, "new_password")}</span>
            <div style={{ position: "relative" }}>
              <input
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}
              >
                {showNewPassword ? t(locale, "hide") : t(locale, "show_action")}
              </button>
            </div>
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" onClick={submitNewPassword} disabled={busy || resetCode.length < 4 || newPassword.length < 6}>
            {busy ? t(locale, "loading") : t(locale, "reset_password_action")}
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={backToLogin}>{t(locale, "back_to_login")}</button>
        </>
      )}
    </div>
  );
}
