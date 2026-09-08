import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import AppShell from "./AppShell";
import AppShellAdvanced from "./AppShellAdvanced";

/**
 * Applique la barre du haut + barre du bas (ou le menu latéral, en
 * interface "Avancée") à toutes les pages propriétaire/chauffeur
 * regroupées dans (app)/. Ce groupe de routes ne change aucune URL
 * (dossier entre parenthèses = ignoré par Next.js), il ajoute seulement ce
 * cadre visuel commun.
 *
 * Le choix Classique/Avancée est lu ici, côté serveur, à partir des
 * réglages en base — jamais chargé après coup côté navigateur, donc
 * aucun risque d'afficher brièvement la mauvaise version au chargement.
 *
 * La vérification d'authentification/abonnement reste dans chaque page
 * (via requireActiveOrg()) — ce layout ne fait qu'une lecture légère de la
 * session pour savoir quoi afficher, sans dupliquer cette logique.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const settings = await getPlatformSettings();
  const isOwner = !!session && "role" in session && session.role === "OWNER";
  const locale = getLocale();

  if (settings.uiTheme === "advanced") {
    return (
      <AppShellAdvanced
        appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage}
        isOwner={isOwner} advancedAccent={settings.advancedAccent} locale={locale}
      >
        {children}
      </AppShellAdvanced>
    );
  }

  return (
    <AppShell appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} isOwner={isOwner} locale={locale}>
      {children}
    </AppShell>
  );
}
