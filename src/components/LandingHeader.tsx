"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { t, type Locale } from "@/lib/i18n";

/**
 * Barre du haut commune aux écrans de connexion (propriétaire/chauffeur ET
 * admin) — logo, nom du site, sélecteur de langue, retour à l'accueil.
 * Centralisée ici pour ne jamais désynchroniser LoginForm.tsx et
 * AdminLoginForm.tsx, qui doivent avoir exactement la même barre.
 *
 * Le bouton Accueil accepte un callback `onHome` optionnel : les deux
 * pages qui utilisent cette barre gèrent leurs étapes (choix
 * propriétaire/chauffeur, mot de passe oublié...) comme un simple état
 * React, sans changer d'URL — un lien classique vers "/login" ne fait donc
 * rien puisque l'utilisateur y est déjà. `onHome` permet à la page
 * d'appeler sa propre fonction de réinitialisation d'état à la place.
 */
export default function LandingHeader({
  appName, logoEmoji, logoType, logoImage, locale, showHome = true, onHome,
}: {
  appName: string; logoEmoji: string; logoType: string; logoImage: string | null; locale: Locale; showHome?: boolean; onHome?: () => void;
}) {
  return (
    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--primary)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {logoType === "image" && logoImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoImage} alt={appName} style={{ width: 28, height: 28, objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 26, lineHeight: 1 }}>{logoEmoji}</span>
        )}
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "var(--font-display)" }}>{appName}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LanguageSwitcher current={locale} />
        {showHome && (
          onHome ? (
            <button
              onClick={onHome}
              aria-label={t(locale, "nav_home")}
              title={t(locale, "nav_home")}
              style={{ padding: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "flex", border: "none", cursor: "pointer" }}
            >
              <Home size={17} color="#fff" />
            </button>
          ) : (
            <Link
              href="/login"
              aria-label={t(locale, "nav_home")}
              title={t(locale, "nav_home")}
              style={{ padding: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "flex" }}
            >
              <Home size={17} color="#fff" />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
