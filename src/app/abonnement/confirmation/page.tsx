"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Page de retour après approbation PayPal. L'activation réelle de
 * l'abonnement se fait via le webhook (seule source fiable, jamais ce
 * retour client) — cette page laisse simplement le temps au webhook
 * d'arriver avant de rediriger, avec un lien manuel en repli.
 */
export default function CheckoutConfirmationPage() {
  const router = useRouter();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setWaited(true);
      router.push("/dashboard");
      router.refresh();
    }, 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="container" style={{ textAlign: "center", marginTop: 80 }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>Vérification de votre paiement…</h1>
      <p className="muted">Quelques secondes, on active votre abonnement.</p>
      {waited && (
        <p style={{ marginTop: 20 }}>
          <a href="/dashboard" style={{ color: "var(--primary)", fontWeight: 600 }}>Continuer →</a>
        </p>
      )}
    </div>
  );
}
