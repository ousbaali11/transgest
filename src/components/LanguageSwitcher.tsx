"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { locales, localeInfo, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function choose(locale: Locale) {
    if (locale === current) { setOpen(false); return; }
    setBusy(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={localeInfo[current].label}
        title={localeInfo[current].label}
        style={{ padding: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
      >
        {localeInfo[current].flag}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 55 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 60, minWidth: 160,
            }}
          >
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => choose(loc)}
                disabled={busy}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none",
                  background: loc === current ? "var(--primary-10)" : "#fff", cursor: "pointer", textAlign: "left", fontSize: 14,
                  color: "var(--text)", fontWeight: loc === current ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 17 }}>{localeInfo[loc].flag}</span>
                {localeInfo[loc].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
