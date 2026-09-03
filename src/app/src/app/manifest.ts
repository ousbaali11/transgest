import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Metadata route dynamique : reflète le nom et le thème configurés par
// l'admin (PlatformSettings) plutôt que des valeurs figées.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await prisma.platformSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);

  const appName = settings?.appName || "TransGest";

  return {
    name: `${appName} — Gestion de flotte poids lourds`,
    short_name: appName,
    description: "Voyages, dépenses et factures pour propriétaires de camions.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F4EF",
    theme_color: settings?.themePrimary || "#16305B",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
