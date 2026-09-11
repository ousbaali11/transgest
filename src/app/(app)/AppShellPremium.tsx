"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Route, Fuel, Receipt, Truck, Users, Columns3, Download, Settings, Menu, X, LogOut, Plus, CircleUser,
} from "lucide-react";
import { t, type Locale, type TKey } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Interface "Premium" — troisième apparence, à côté de AppShell.tsx
 * (Classique) et AppShellAdvanced.tsx (Avancée), qui restent intacts.
 *
 * Organisation : en-tête blanc (marque, titre de l'écran, action
 * principale "Nouveau voyage", langue, utilisateur, déconnexion) + menu
 * latéral par rubriques — Activité (tableau de bord, voyages, dépenses,
 * factures), Gestion (camions & chauffeurs, clients, colonnes), Outils
 * (export Excel), Compte (réglages). Sur tablette le menu devient un rail
 * d'icônes ; sur téléphone, un tiroir reprend exactement les mêmes liens et
 * une barre du bas garde les quatre écrans du quotidien à un pouce.
 *
 * Purement une disposition : mêmes destinations, mêmes permissions
 * (isOwner), même contenu de page (`children`). dir="ltr" est posé
 * UNIQUEMENT sur l'en-tête, le menu latéral, le tiroir et la barre du bas —
 * jamais sur le contenu, qui garde le sens du document (RTL en darija).
 */
type Icon = typeof Route;
type NavItem = { href: string; label: TKey; icon: Icon; download?: boolean };
type NavGroup = { label: TKey; items: NavItem[] };

export default function AppShellPremium({
  appName, logoEmoji, logoType, logoImage, isOwner, userLabel, locale, children,
}: {
  appName: string; logoEmoji: string; logoType: string; logoImage: string | null;
  isOwner: boolean; userLabel: string; locale: Locale; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const groups: NavGroup[] = [
    {
      label: "nav_group_activity",
      items: [
        { href: "/dashboard", label: "nav_home", icon: LayoutDashboard },
        { href: "/trips", label: "nav_trips", icon: Route },
        { href: "/expenses", label: "nav_expenses", icon: Fuel },
        { href: "/factures", label: "nav_invoices", icon: Receipt },
      ],
    },
    ...(isOwner
      ? [
          {
            label: "nav_group_management" as TKey,
            items: [
              { href: "/flotte", label: "nav_fleet" as TKey, icon: Truck },
              { href: "/clients", label: "nav_clients" as TKey, icon: Users },
              { href: "/colonnes", label: "nav_custom_fields" as TKey, icon: Columns3 },
            ],
          },
          {
            label: "nav_group_tools" as TKey,
            items: [{ href: "/api/export", label: "nav_export_excel" as TKey, icon: Download, download: true }],
          },
        ]
      : []),
    { label: "nav_group_account", items: [{ href: "/reglages", label: "nav_settings", icon: Settings }] },
  ];
  const allItems = groups.flatMap((g) => g.items);
  const isActive = (item: NavItem) => !item.download && pathname.startsWith(item.href);
  const current = allItems.find(isActive);
  const pageTitle = current ? t(locale, current.label) : appName;
  const bottomTabs = groups[0].items;

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

  const brand = (
    <Link href="/dashboard" className="pm-brand">
      {logoType === "image" && logoImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoImage} alt={appName} style={{ width: 28, height: 28, objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 24, lineHeight: 1 }}>{logoEmoji}</span>
      )}
      <span className="pm-brand-name">{appName}</span>
    </Link>
  );

  // L'export Excel est un téléchargement, pas une page : lien classique,
  // jamais <Link> (qui le préchargerait à chaque affichage du menu).
  const navLink = (item: NavItem, onNavigate?: () => void) => {
    const active = isActive(item);
    const inner = (
      <>
        <item.icon size={18} />
        <span className="pm-label">{t(locale, item.label)}</span>
      </>
    );
    const cls = `pm-link${active ? " active" : ""}`;
    const title = t(locale, item.label);
    return item.download ? (
      <a key={item.href} href={item.href} className={cls} title={title} onClick={onNavigate}>{inner}</a>
    ) : (
      <Link key={item.href} href={item.href} className={cls} title={title} onClick={onNavigate}>{inner}</Link>
    );
  };

  const navGroups = (onNavigate?: () => void, listMode = false) => (
    <nav className={listMode ? "pm-nav-list" : undefined} aria-label={t(locale, "nav_menu")}>
      {groups.map((g) => (
        <div key={g.label} className="pm-group">
          <div className="pm-group-label">{t(locale, g.label)}</div>
          {g.items.map((item) => navLink(item, onNavigate))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="app-premium">
      <header className="pm-header" dir="ltr">
        <div className="pm-header-side">
          <button className="pm-icon-btn pm-mobile-only" onClick={() => setDrawerOpen(true)} aria-label={t(locale, "nav_menu")} title={t(locale, "nav_menu")}>
            <Menu size={18} />
          </button>
          {brand}
          <span className="pm-page-title" aria-hidden="true">/ {pageTitle}</span>
        </div>
        <div className="pm-header-side">
          <Link href="/trips?new=1" className="pm-primary-action" title={t(locale, "dashboard_new_trip")}>
            <Plus size={16} />
            <span className="pm-label">{t(locale, "dashboard_new_trip")}</span>
          </Link>
          <LanguageSwitcher current={locale} onLight />
          <span className="pm-user-chip" title={userLabel}>
            <CircleUser size={16} />
            {userLabel}
          </span>
          <button className="pm-icon-btn" onClick={logout} disabled={logoutBusy} aria-label={t(locale, "nav_logout")} title={t(locale, "nav_logout")}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <aside className="pm-sidebar" dir="ltr">
        {navGroups()}
      </aside>

      {drawerOpen && (
        <div className="pm-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="pm-drawer" dir="ltr" onClick={(e) => e.stopPropagation()}>
            <div className="pm-drawer-head">
              {brand}
              <button className="pm-icon-btn" onClick={() => setDrawerOpen(false)} aria-label={t(locale, "close_action")} title={t(locale, "close_action")}>
                <X size={18} />
              </button>
            </div>
            {navGroups(() => setDrawerOpen(false), true)}
            <div className="pm-drawer-foot">
              <span className="pm-user-line"><CircleUser size={16} /> {userLabel}</span>
              <button className="pm-icon-btn" onClick={logout} disabled={logoutBusy} aria-label={t(locale, "nav_logout")} title={t(locale, "nav_logout")}>
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pm-content">{children}</main>

      <nav className="pm-bottombar" dir="ltr" aria-label={t(locale, "nav_menu")}>
        {bottomTabs.map((item) => (
          <Link key={item.href} href={item.href} className={`pm-tab${isActive(item) ? " active" : ""}`}>
            <item.icon size={19} />
            {t(locale, item.label)}
          </Link>
        ))}
        <button className="pm-tab" onClick={() => setDrawerOpen(true)}>
          <Menu size={19} />
          {t(locale, "nav_menu")}
        </button>
      </nav>
    </div>
  );
}
