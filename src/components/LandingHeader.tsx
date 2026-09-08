"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { t, type Locale } from "@/lib/i18n";

/**
 * Barre du haut commune aux écrans de connexion (propriétaire/chauffeur ET
 * admin) ET à l'écran d'abonnement bloqué — logo, nom du site, sélecteur
 * de langue, et Accueil OU Déconnexion selon le contexte. Centralisée ici
 * pour ne jamais désynchroniser ces différentes pages, qui doivent avoir
 * exactement la même barre.
 *
 * Le bouton Accueil accepte un callback `onHome` optionnel : LoginForm et
 * AdminLoginForm gèrent leurs étapes (choix propriétaire/chauffeur, mot de
 * passe oublié...) comme un simple état React, sans changer d'URL — un
 * lien classique vers "/login" ne fait donc rien puisque l'utilisateur y
 * est déjà. `onHome` permet à la page d'appeler sa propre fonction de
 * réinitialisation d'état à la place.
 *
 * `logoutRedirectTo` active un bouton de déconnexion à la place du bouton
 * Accueil — utilisé sur l'écran d'abonnement bloqué, où l'utilisateur est
 * déjà connecté et où "Accueil" n'aurait pas de sens.
 *
 * `uiTheme` bascule uniquement l'apparence (fond clair avec bordure au
 * lieu de la barre pleine couleur) — même contenu, mêmes actions.
 *
 * `advancedAccent` ("gray" | "blue") : dégradé optionnel appliqué
 * uniquement quand l'admin utilise cette barre (page Admin) — laisser
 * vide ailleurs garde un fond blanc uni, comme sur les écrans de connexion.
 */
export default function LandingHeader({
  appName, logoEmoji, logoType, logoImage, locale, showHome = true, onHome, logoutRedirectTo, uiTheme = "classic", advancedAccent,
}: {
  appName: string; logoEmoji: string; logoType: string; logoImage: string | null; locale: Locale;
  showHome?: boolean; onHome?: () => void; logoutRedirectTo?: string; uiTheme?: string; advancedAccent?: string;
}) {
  const router = useRouter();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const advanced = uiTheme === "advanced";
  const iconColor = advanced ? "#1A1A1E" : "#fff";
  const iconBg = advanced ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.12)";
  const advancedBackground =
    advancedAccent === "blue" ? "linear-gradient(180deg, #E1EDFB 0%, #FBFDFF 100%)"
    : advancedAccent === "gray" ? "linear-gradient(180deg, #E9ECF0 0%, #FCFCFD 100%)"
    : "#fff";

  async function logout() {
    setLogoutBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Échec de la déconnexion :", e);
    } finally {
      router.push(logoutRedirectTo || "/login");
      router.refresh();
    }
  }

  return (
    <div
      dir="ltr"
      style={{
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: advanced ? advancedBackground : "var(--primary)",
        borderBottom: advanced ? "1px solid #E7E7E9" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {logoType === "image" && logoImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoImage} alt={appName} style={{ width: 28, height: 28, objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 26, lineHeight: 1 }}>{logoEmoji}</span>
        )}
        <span style={{ color: advanced ? "#1A1A1E" : "#fff", fontWeight: 700, fontSize: 16, fontFamily: "var(--font-display)" }}>{appName}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LanguageSwitcher current={locale} onLight={advanced} />
        {logoutRedirectTo ? (
          <button
            onClick={logout}
            disabled={logoutBusy}
            aria-label={t(locale, "nav_logout")}
            title={t(locale, "nav_logout")}
            style={{ padding: 8, borderRadius: 999, background: iconBg, display: "flex", border: "none", cursor: "pointer" }}
          >
            <LogOut size={17} color={iconColor} />
          </button>
        ) : showHome ? (
          onHome ? (
            <button
              onClick={onHome}
              aria-label={t(locale, "nav_home")}
              title={t(locale, "nav_home")}
              style={{ padding: 8, borderRadius: 999, background: iconBg, display: "flex", border: "none", cursor: "pointer" }}
            >
              <Home size={17} color={iconColor} />
            </button>
          ) : (
            <Link
              href="/login"
              aria-label={t(locale, "nav_home")}
              title={t(locale, "nav_home")}
              style={{ padding: 8, borderRadius: 999, background: iconBg, display: "flex" }}
            >
              <Home size={17} color={iconColor} />
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
