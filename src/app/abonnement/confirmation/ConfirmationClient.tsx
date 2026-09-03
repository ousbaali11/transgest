"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

/**
 * Page de retour après approbation PayPal. L'activation réelle de
 * l'abonnement se fait via le webhook (seule source fiable, jamais ce
 * retour client) — cette page laisse simplement le temps au webhook
 * d'arriver avant de rediriger, avec un lien manuel en repli.
 */
export default function ConfirmationClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWaited(true);
      router.push("/dashboard");
      router.refresh();
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="container" style={{ textAlign: "center", marginTop: 80 }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>{t(locale, "checkout_verifying")}</h1>
      <p className="muted">{t(locale, "checkout_verifying_desc")}</p>
      {waited && (
        <p style={{ marginTop: 20 }}>
          <a href="/dashboard" style={{ color: "var(--primary)", fontWeight: 600 }}>{t(locale, "continue_action")}</a>
        </p>
      )}
    </div>
  );
}
