"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { locales, localeInfo, type Locale } from "@/lib/i18n";

/**
 * Le menu déroulant utilise `position: fixed` avec des coordonnées
 * calculées en JavaScript (plutôt que `position: absolute` classique) —
 * indispensable ici car ce bouton est parfois placé dans un conteneur au
 * défilement vertical actif (barre latérale) : un `position: absolute`
 * classique se retrouverait alors régulièrement découpé/masqué par ce
 * conteneur, pile le bug remonté ("la liste se cache parfois").
 * `position: fixed` s'affranchit de tout ancêtre, quel qu'il soit.
 */
export default function LanguageSwitcher({ current, onLight = false }: { current: Locale; onLight?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeightEstimate = locales.length * 40 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeightEstimate && rect.top > menuHeightEstimate;
    // Reste toujours dans la largeur de l'écran, même si le bouton est
    // tout près du bord droit (barre latérale étroite, petit écran...).
    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
    setMenuPos(
      openUpward
        ? { bottom: window.innerHeight - rect.top + 8, left: Math.max(8, left) }
        : { top: rect.bottom + 8, left: Math.max(8, left) }
    );
  }, [open]);

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
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={localeInfo[current].label}
        title={localeInfo[current].label}
        style={{
          padding: 8, borderRadius: 999, display: "flex", alignItems: "center", border: "none", cursor: "pointer",
          background: onLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.12)",
        }}
      >
        <Languages size={17} color={onLight ? "#1A1A1E" : "#fff"} />
      </button>

      {open && menuPos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 55 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "fixed", ...menuPos, background: "#fff", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 60, width: 150,
            }}
          >
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => choose(loc)}
                disabled={busy}
                style={{
                  display: "block", width: "100%", padding: "10px 14px", border: "none",
                  background: loc === current ? "var(--primary-10)" : "#fff", cursor: "pointer", textAlign: "left", fontSize: 14,
                  color: "var(--text)", fontWeight: loc === current ? 600 : 400,
                }}
              >
                {localeInfo[loc].label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
