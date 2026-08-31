import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "./RegisterServiceWorker";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
