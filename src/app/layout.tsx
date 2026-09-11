import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import RegisterServiceWorker from "./RegisterServiceWorker";
import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import { localeInfo, t } from "@/lib/i18n";

/**
 * Le titre d'onglet suit le nom d'application choisi dans Admin > Marque
 * ("{appName} — Gestion de flotte poids lourds") — d'où generateMetadata()
 * (dynamique, lu en base) plutôt qu'un export const metadata statique.
 * getPlatformSettings() est mémoïsé (React cache()) : cet appel et celui
 * du composant RootLayout plus bas ne déclenchent qu'une seule requête
 * base de données pour la même requête HTTP.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPlatformSettings();
  const locale = getLocale();
  return {
    title: `${settings.appName} — ${t(locale, "app_tagline")}`,
    description: t(locale, "app_description"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.appName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#16305B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPlatformSettings();
  const locale = getLocale();

  // Les couleurs choisies dans Admin > Thème sont injectées ici en variables
  // CSS sur <body> : elles écrasent les valeurs par défaut de globals.css
  // pour l'ensemble du site, sans avoir à dupliquer ce réglage page par page.
  const themeStyle = {
    "--primary": settings.themePrimary,
    "--primary-10": `${settings.themePrimary}1a`,
    "--accent": settings.themeAccent,
    // Flèche "retour" des en-têtes d'écran : pointe vers le début de la
    // ligne, donc retournée en darija (sens droite → gauche).
    "--back-arrow-flip": localeInfo[locale].dir === "rtl" ? "scaleX(-1)" : "none",
  } as CSSProperties;

  return (
    <html lang={locale} dir={localeInfo[locale].dir}>
      <body style={themeStyle}>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
