"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function AdminLoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, marginTop: 40, marginBottom: 4 }}>{t(locale, "admin_area_title")}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>{t(locale, "admin_area_desc")}</p>

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
      {error && <p className="error-text">{error}</p>}
      <button className="btn" onClick={submit} disabled={busy || !email || !password}>{busy ? t(locale, "loading") : t(locale, "login_connect")}</button>

      <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        {t(locale, "admin_login_hint")} <code>prisma/seed.ts</code> — README.
      </p>
    </div>
  );
}
