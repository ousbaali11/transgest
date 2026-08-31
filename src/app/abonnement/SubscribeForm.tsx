"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Currency } from "@/lib/currency";

type Plan = { id: string; key: string; label: string; priceMAD: number; tagline: string | null };

export default function SubscribeForm({ plans, initialCurrency }: { plans: Plan[]; initialCurrency: Currency }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [busy, setBusy] = useState(false);

  async function subscribe(planKey: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/subscription/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="muted">Devise détectée automatiquement</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ width: 110 }}>
          <option value="MAD">MAD (DH)</option>
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>

      {plans.map((plan) => (
        <div key={plan.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <strong>{plan.label}</strong>
            <strong style={{ color: "var(--primary)" }}>
              {formatMoney(plan.priceMAD, currency)}{plan.priceMAD ? <span className="muted">/mois</span> : null}
            </strong>
          </div>
          <p className="muted" style={{ marginBottom: 12 }}>{plan.tagline}</p>
          <button className="btn" disabled={busy} onClick={() => subscribe(plan.key)}>
            {plan.priceMAD ? "S'abonner" : "Continuer gratuitement"}
          </button>
          {plan.priceMAD > 0 && (
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              Paiement de démonstration — branchez CMI/PayZone avant la mise en production (voir README).
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
