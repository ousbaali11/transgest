"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

export default function SeedDemoButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-ghost" disabled={busy} onClick={load} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Sparkles size={15} /> {busy ? t(locale, "loading") : t(locale, "dashboard_load_example")}
    </button>
  );
}
