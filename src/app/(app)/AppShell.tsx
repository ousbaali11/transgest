"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Route, Fuel, Receipt, Menu, Settings, Truck, Users, Package, Download, ChevronRight, X, LogOut } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AppShell({
  appName, logoEmoji, logoType, logoImage, isOwner, locale, children,
}: {
  appName: string; logoEmoji: string; logoType: string; logoImage: string | null; isOwner: boolean; locale: Locale; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [plusOpen, setPlusOpen] = useState(false);

  const TABS = [
    { href: "/dashboard", label: t(locale, "nav_home"), icon: Home },
    { href: "/trips", label: t(locale, "nav_trips"), icon: Route },
    { href: "/expenses", label: t(locale, "nav_expenses"), icon: Fuel },
    { href: "/factures", label: t(locale, "nav_invoices"), icon: Receipt },
  ];

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Échec de la déconnexion :", e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const plusItems = [
    ...(isOwner
      ? [
          { href: "/flotte", label: t(locale, "nav_fleet"), icon: Truck },
          { href: "/clients", label: t(locale, "nav_clients"), icon: Users },
          { href: "/colonnes", label: t(locale, "nav_custom_fields"), icon: Package },
          { href: "/api/export", label: t(locale, "nav_export_excel"), icon: Download },
        ]
      : []),
    { href: "/reglages", label: t(locale, "nav_settings"), icon: Settings },
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LanguageSwitcher current={locale} />
          <Link href="/reglages" aria-label={t(locale, "nav_settings")} title={t(locale, "nav_settings")} style={{ padding: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "flex" }}>
            <Settings size={17} color="#fff" />
          </Link>
          <button
            onClick={logout}
            aria-label={t(locale, "nav_logout")}
            title={t(locale, "nav_logout")}
            style={{ padding: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "flex", border: "none", cursor: "pointer" }}
          >
            <LogOut size={17} color="#fff" />
          </button>
        </div>
      </div>

      {/* Contenu de la page */}
      <div style={{ flex: 1, paddingBottom: 76 }}>{children}</div>

      {/* Barre du bas */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid var(--line)", display: "flex", maxWidth: 480, margin: "0 auto", zIndex: 40 }}>
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 0 8px", textDecoration: "none" }}>
              <tab.icon size={19} color={active ? "var(--primary)" : "#9CA3AF"} />
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? "var(--primary)" : "#9CA3AF" }}>{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setPlusOpen(true)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer" }}
        >
          <Menu size={19} color={plusOpen ? "var(--primary)" : "#9CA3AF"} />
          <span style={{ fontSize: 10, fontWeight: 600, color: plusOpen ? "var(--primary)" : "#9CA3AF" }}>{t(locale, "nav_more")}</span>
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
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>{t(locale, "nav_more")}</strong>
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
