import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import RegisterServiceWorker from "./RegisterServiceWorker";
import { getPlatformSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "TransGest — Gestion de flotte poids lourds",
  description: "Voyages, dépenses et factures pour propriétaires de camions.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TransGest",
  },
};

export const viewport: Viewport = {
  themeColor: "#16305B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPlatformSettings();

  // Les couleurs choisies dans Admin > Thème sont injectées ici en variables
  // CSS sur <body> : elles écrasent les valeurs par défaut de globals.css
  // pour l'ensemble du site, sans avoir à dupliquer ce réglage page par page.
  const themeStyle = {
    "--primary": settings.themePrimary,
    "--primary-10": `${settings.themePrimary}1a`,
    "--accent": settings.themeAccent,
  } as CSSProperties;

  return (
    <html lang="fr">
      <body style={themeStyle}>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
