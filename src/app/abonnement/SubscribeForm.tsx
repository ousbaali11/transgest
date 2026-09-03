"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Currency } from "@/lib/currency";

type Plan = {
  id: string; key: string; label: string; priceMAD: number; tagline: string | null;
  priceMonthlyMAD: number | null; priceAnnualMAD: number | null;
  stripePriceIdMonthly: string | null; stripePriceIdAnnual: string | null;
  paypalPlanIdMonthly: string | null; paypalPlanIdAnnual: string | null;
};
type Interval = "monthly" | "annual";

export default function SubscribeForm({
  plans, initialCurrency, stripeEnabled, paypalEnabled,
}: {
  plans: Plan[]; initialCurrency: Currency; stripeEnabled: boolean; paypalEnabled: boolean;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function subscribeFree(planKey: string) {
    setBusy(planKey);
    setError("");
    try {
      const res = await fetch("/api/subscription/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { router.push("/dashboard"); router.refresh(); }
      else setError(data.error || "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function checkout(provider: "stripe" | "paypal", planKey: string) {
    setBusy(`${provider}-${planKey}`);
    setError("");
    try {
      const res = await fetch(`/api/subscription/checkout/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Impossible de démarrer le paiement.");
        setBusy(null);
      }
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
      setBusy(null);
    }
  }

  const anyPaidPlan = plans.some((p) => p.priceMAD > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <span className="muted">Devise détectée automatiquement</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ width: 110 }}>
          <option value="MAD">MAD (DH)</option>
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>

      {anyPaidPlan && (
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 16 }}>
          {(["monthly", "annual"] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              style={{ flex: 1, padding: 10, border: "none", cursor: "pointer", fontWeight: 600, background: interval === iv ? "var(--primary)" : "#fff", color: interval === iv ? "#fff" : "var(--text)" }}
            >
              {iv === "monthly" ? "Mensuel" : "Annuel"}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      {plans.map((plan) => {
        const isFree = plan.priceMAD === 0;
        const priceForInterval = interval === "annual" ? (plan.priceAnnualMAD ?? plan.priceMonthlyMAD ?? plan.priceMAD) : (plan.priceMonthlyMAD ?? plan.priceMAD);
        const canStripe = stripeEnabled && (interval === "annual" ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly);
        const canPaypal = paypalEnabled && (interval === "annual" ? plan.paypalPlanIdAnnual : plan.paypalPlanIdMonthly);

        return (
          <div key={plan.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong>{plan.label}</strong>
              <strong style={{ color: "var(--primary)" }}>
                {formatMoney(priceForInterval, currency)}
                {!isFree && <span className="muted">/{interval === "annual" ? "an" : "mois"}</span>}
              </strong>
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>{plan.tagline}</p>

            {isFree ? (
              <button className="btn" disabled={busy !== null} onClick={() => subscribeFree(plan.key)}>
                {busy === plan.key ? "…" : "Continuer gratuitement"}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {canStripe && (
                  <button className="btn" disabled={busy !== null} onClick={() => checkout("stripe", plan.key)}>
                    {busy === `stripe-${plan.key}` ? "…" : "Payer par carte"}
                  </button>
                )}
                {canPaypal && (
                  <button className="btn" style={{ background: "#0070BA" }} disabled={busy !== null} onClick={() => checkout("paypal", plan.key)}>
                    {busy === `paypal-${plan.key}` ? "…" : "Payer avec PayPal"}
                  </button>
                )}
                {!canStripe && !canPaypal && (
                  <p className="muted" style={{ fontSize: 12 }}>Aucun moyen de paiement disponible pour le moment — contactez le support.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
