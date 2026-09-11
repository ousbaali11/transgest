"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type Purpose = "VIEW_SUBSCRIPTIONS" | "CHANGE_CONTACT_EMAIL";

/**
 * Protège une action admin sensible derrière un code envoyé par email à
 * l'adresse de CONTACT configurée (jamais une adresse fournie par
 * l'utilisateur au moment même) — réutilisé pour accéder à la section
 * Abonnements et pour changer l'email de contact lui-même. Un seul
 * composant pour les deux usages : ne pas dupliquer cette logique.
 *
 * `contactEmailConfigured` : si aucun email de contact n'est encore
 * réglé, il n'y a nulle part où envoyer un code — dans ce cas on ignore
 * la vérification et on affiche directement le contenu (rien à protéger
 * tant qu'aucune adresse de confiance n'existe).
 */
export default function AdminActionCodeGate({
  purpose, contactEmailConfigured, locale, onVerified, children,
}: {
  purpose: Purpose; contactEmailConfigured: boolean; locale: Locale; onVerified?: () => void; children: React.ReactNode;
}) {
  const [verified, setVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!contactEmailConfigured || verified) {
    return <>{children}</>;
  }

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/action-code/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCodeSent(true);
        setDevCode(data.devCode || null);
      } else {
        setError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setError(t(locale, "server_unreachable_short"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/action-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setVerified(true);
        onVerified?.();
      } else {
        setError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setError(t(locale, "server_unreachable_short"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{t(locale, "admin_action_code_desc")}</p>
      {!codeSent ? (
        <button className="btn" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={sendCode}>
          {busy ? t(locale, "loading") : t(locale, "login_receive_code")}
        </button>
      ) : (
        <>
          {devCode && (
            <div className="card" style={{ background: "var(--primary-10)", border: "none", marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>{t(locale, "dev_mode_code")} </span>
              <strong>{devCode}</strong>
            </div>
          )}
          <label className="field">
            <span className="field-label">{t(locale, "verification_code")}</span>
            <input type="tel" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value)} placeholder="0000" style={{ maxWidth: 140 }} />
          </label>
          <button className="btn" style={{ width: "auto", padding: "8px 16px" }} disabled={busy || code.length < 4} onClick={verifyCode}>
            {busy ? t(locale, "loading") : t(locale, "login_verify")}
          </button>
        </>
      )}
      {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
