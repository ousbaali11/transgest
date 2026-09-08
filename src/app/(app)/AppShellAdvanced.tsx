"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Route, Fuel, Receipt, Menu, Settings, Truck, Users, Package, Download, X, LogOut } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Version "Avancée" de AppShell.tsx — menu latéral façon Notion/Linear au
 * lieu de la barre du haut + barre du bas. Purement une disposition
 * différente : mêmes destinations, mêmes permissions (isOwner), même
 * contenu de page (`children`) — rien dans ce fichier ne touche à une
 * logique métier.
 *
 * Sur petit écran, la barre latérale (largeur fixe) ne peut pas rester
 * affichée sans écraser le contenu — elle est donc entièrement remplacée
 * par une barre du haut fine + un tiroir coulissant reprenant exactement
 * les mêmes liens, pour ne jamais perdre l'accès à une fonctionnalité.
 */
export default function AppShellAdvanced({
  appName, logoEmoji, logoType, logoImage, isOwner, advancedAccent, locale, children,
}: {
  appName: string; logoEmoji: string; logoType: string; logoImage: string | null; isOwner: boolean; advancedAccent: string; locale: Locale; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const NAV_ITEMS = [
    { href: "/dashboard", label: t(locale, "nav_home"), icon: Home },
    { href: "/trips", label: t(locale, "nav_trips"), icon: Route },
    { href: "/expenses", label: t(locale, "nav_expenses"), icon: Fuel },
    { href: "/factures", label: t(locale, "nav_invoices"), icon: Receipt },
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

  async function logout() {
    setLogoutBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Échec de la déconnexion :", e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const logoBlock = (
    <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
      {logoType === "image" && logoImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoImage} alt={appName} style={{ width: 26, height: 26, objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 22, lineHeight: 1 }}>{logoEmoji}</span>
      )}
      <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-display)" }}>{appName}</span>
    </Link>
  );

  const navLinks = (onNavigate?: () => void) => (
    <nav style={{ flex: 1 }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href) && item.href !== "/api/export";
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={`adv-sidebar-link${active ? " active" : ""}`}>
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="app-advanced" data-accent={advancedAccent}>
      {/* Barre latérale — bureau/tablette large. dir="ltr" ici uniquement
          (jamais sur l'enveloppe globale ci-dessus) : la navigation reste
          dans un sens fixe quelle que soit la langue, mais le contenu de
          page plus bas (main.adv-content) doit garder le sens normal du
          document — RTL en Darija — sans quoi tout le texte des pages se
          retrouverait forcé à gauche même en arabe. */}
      <aside className="adv-sidebar" dir="ltr">
        <div style={{ padding: "0 12px", marginBottom: 20 }}>{logoBlock}</div>
        {navLinks()}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 0", borderTop: "1px solid var(--adv-border)", marginTop: 12 }}>
          <LanguageSwitcher current={locale} onLight />
          <button
            onClick={logout}
            disabled={logoutBusy}
            aria-label={t(locale, "nav_logout")}
            title={t(locale, "nav_logout")}
            style={{ padding: 8, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex" }}
          >
            <LogOut size={17} color="var(--adv-text-muted)" />
          </button>
        </div>
      </aside>

      {/* Barre du haut — mobile/tablette étroite : remplace la barre
          latérale (qui écraserait le contenu), un tiroir reprend les mêmes liens. */}
      <div dir="ltr" className="adv-mobile-topbar">
        {logoBlock}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LanguageSwitcher current={locale} onLight />
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={t(locale, "nav_more")}
            style={{ padding: 8, borderRadius: 8, background: "var(--adv-bg)", border: "none", cursor: "pointer", display: "flex" }}
          >
            <Menu size={20} color="var(--adv-text)" />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex" }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            dir="ltr"
            style={{ width: 260, maxWidth: "80vw", height: "100%", background: "var(--adv-surface)", padding: 16, display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              {logoBlock}
              <button onClick={() => setDrawerOpen(false)} aria-label={t(locale, "close_action")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--adv-text)" />
              </button>
            </div>
            {navLinks(() => setDrawerOpen(false))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 0", borderTop: "1px solid var(--adv-border)", marginTop: 12 }}>
              <LanguageSwitcher current={locale} onLight />
              <button
                onClick={logout}
                disabled={logoutBusy}
                aria-label={t(locale, "nav_logout")}
                style={{ padding: 8, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex" }}
              >
                <LogOut size={17} color="var(--adv-text-muted)" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="adv-content">{children}</main>
    </div>
  );
}
