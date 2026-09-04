"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function SubscriptionActions({ cancelAtPeriodEnd, locale }: { cancelAtPeriodEnd: boolean; locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function call(path: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/subscription/${path}`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        setConfirming(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setError(t(locale, "server_unreachable_short"));
    } finally {
      setBusy(false);
    }
  }

  if (cancelAtPeriodEnd) {
    return (
      <div>
        <button className="btn btn-ghost" disabled={busy} onClick={() => call("reactivate")}>{t(locale, "reactivate_subscription")}</button>
        {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div>
        <p className="muted" style={{ marginBottom: 8 }}>
          {t(locale, "cancel_subscription_warning")}
        </p>
        {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)}>{t(locale, "cancel")}</button>
          <button className="btn btn-danger" disabled={busy} onClick={() => call("cancel")}>{t(locale, "confirm_action")}</button>
        </div>
      </div>
    );
  }

  return <button className="btn btn-danger" onClick={() => setConfirming(true)}>{t(locale, "cancel_subscription")}</button>;
}
