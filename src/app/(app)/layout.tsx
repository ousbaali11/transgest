import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import AppShell from "./AppShell";

/**
 * Applique la barre du haut + barre du bas persistantes à toutes les pages
 * propriétaire/chauffeur regroupées dans (app)/. Ce groupe de routes ne
 * change aucune URL (dossier entre parenthèses = ignoré par Next.js), il
 * ajoute seulement ce cadre visuel commun.
 *
 * La vérification d'authentification/abonnement reste dans chaque page
 * (via requireActiveOrg()) — ce layout ne fait qu'une lecture légère de la
 * session pour savoir quoi afficher, sans dupliquer cette logique.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const settings = await getPlatformSettings();
  const isOwner = !!session && "role" in session && session.role === "OWNER";

  return (
    <AppShell appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} isOwner={isOwner}>
      {children}
    </AppShell>
  );
}
