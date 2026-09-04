"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function InvoiceStatusToggle({ id, status, locale }: { id: string; status: string; locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "PAYEE" ? "EN_ATTENTE" : "PAYEE" }),
      });
      router.refresh();
    } catch (e) {
      console.error("Échec de la mise à jour du statut de facture :", e);
    } finally {
      setBusy(false);
    }
  }

  const isPaid = status === "PAYEE";
  return (
    <button
      onClick={toggle}
      disabled={busy}
      style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, border: "none", cursor: "pointer", background: isPaid ? "#E4F3EA" : "#FDF1DF", color: isPaid ? "#2E7D53" : "#B5791C" }}
    >
      {isPaid ? t(locale, "invoice_paid") : t(locale, "invoice_pending")}
    </button>
  );
}
