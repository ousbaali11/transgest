"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionActions({ cancelAtPeriodEnd }: { cancelAtPeriodEnd: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function call(path: string) {
    setBusy(true);
    try {
      await fetch(`/api/subscription/${path}`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (cancelAtPeriodEnd) {
    return <button className="btn btn-ghost" disabled={busy} onClick={() => call("reactivate")}>Réactiver l'abonnement</button>;
  }

  if (confirming) {
    return (
      <div>
        <p className="muted" style={{ marginBottom: 8 }}>
          Vous garderez l'accès jusqu'à la fin de la période déjà payée, puis le compte se verrouillera.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Annuler</button>
          <button className="btn btn-danger" disabled={busy} onClick={() => call("cancel")}>Confirmer</button>
        </div>
      </div>
    );
  }

  return <button className="btn btn-danger" onClick={() => setConfirming(true)}>Résilier l'abonnement</button>;
}
