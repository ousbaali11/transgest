"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Route, Fuel, Receipt, Menu, Settings, Truck, Users, Package, Download, ChevronRight, X } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/trips", label: "Voyages", icon: Route },
  { href: "/expenses", label: "Dépenses", icon: Fuel },
  { href: "/factures", label: "Factures", icon: Receipt },
];

export default function AppShell({
  appName, logoEmoji, logoType, logoImage, isOwner, children,
}: {
  appName: string; logoEmoji: string; logoType: string; logoImage: string | null; isOwner: boolean; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [plusOpen, setPlusOpen] = useState(false);

  const plusItems = [
    ...(isOwner
      ? [
          { href: "/flotte", label: "Camions & chauffeurs", icon: Truck },
          { href: "/clients", label: "Clients", icon: Users },
          { href: "/colonnes", label: "Colonnes personnalisées", icon: Package },
          { href: "/api/export", label: "Exporter en Excel", icon: Download },
        ]
      : []),
    { href: "/reglages", label: "Réglages", icon: Settings },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Barre du haut */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--primary)" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {logoType === "image" && logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoImage} alt={appName} style={{ width: 28, height: 28, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 26, lineHeight: 1 }}>{logoEmoji}</span>
          )}
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "var(--font-display)", lineHeight: 1.2 }}>{appName}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Gestion de flotte poids lourds</div>
          </div>
        </Link>
        <Link href="/reglages" aria-label="Réglages" style={{ padding: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "flex" }}>
          <Settings size={17} color="#fff" />
        </Link>
      </div>

      {/* Contenu de la page */}
      <div style={{ flex: 1, paddingBottom: 76 }}>{children}</div>

      {/* Barre du bas */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid var(--line)", display: "flex", maxWidth: 480, margin: "0 auto", zIndex: 40 }}>
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 0 8px", textDecoration: "none" }}>
              <t.icon size={19} color={active ? "var(--primary)" : "#9CA3AF"} />
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? "var(--primary)" : "#9CA3AF" }}>{t.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setPlusOpen(true)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer" }}
        >
          <Menu size={19} color={plusOpen ? "var(--primary)" : "#9CA3AF"} />
          <span style={{ fontSize: 10, fontWeight: 600, color: plusOpen ? "var(--primary)" : "#9CA3AF" }}>Plus</span>
        </button>
      </div>

      {/* Feuille "Plus" */}
      {plusOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
          onClick={() => setPlusOpen(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, margin: "0 auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>Plus</strong>
              <button onClick={() => setPlusOpen(false)} aria-label="Fermer" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text)" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plusItems.map((it) => (
                <a
                  key={it.href}
                  href={it.href}
                  onClick={() => setPlusOpen(false)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: "1px solid var(--line)", borderRadius: 8, textDecoration: "none", color: "var(--text)" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500 }}>
                    <it.icon size={17} color="var(--primary)" /> {it.label}
                  </span>
                  <ChevronRight size={16} color="#9CA3AF" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
