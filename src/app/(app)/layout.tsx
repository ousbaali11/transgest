import { getValidSession } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import AppShell from "./AppShell";
import AppShellAdvanced from "./AppShellAdvanced";
import AppShellPremium from "./AppShellPremium";

/**
 * Applique le cadre de navigation choisi dans Admin > Apparence (Classique,
 * Avancée ou Premium) à toutes les pages propriétaire/chauffeur regroupées
 * dans (app)/. Ce groupe de routes ne change aucune URL (dossier entre
 * parenthèses = ignoré par Next.js), il ajoute seulement ce cadre visuel
 * commun.
 *
 * Le choix est lu ici, côté serveur, à partir des réglages en base —
 * jamais chargé après coup côté navigateur, donc aucun risque d'afficher
 * brièvement la mauvaise version au chargement.
 *
 * La vérification d'authentification/abonnement reste dans chaque page
 * (via requireActiveOrg()) — ce layout ne fait qu'une lecture légère de la
 * session pour savoir quoi afficher, sans dupliquer cette logique.
 * getValidSession est mémoïsée : la page qui suit ne refait pas la requête.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidSession();
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

  if (settings.uiTheme === "premium") {
    // Libellé affiché dans l'en-tête (email du propriétaire, nom du
    // chauffeur) — purement informatif, aucune décision d'accès n'en dépend.
    const userLabel = session?.role === "OWNER" ? session.email : session?.role === "DRIVER" ? `${session.driverName} · ${t(locale, "field_driver")}` : "";
    return (
      <AppShellPremium
        appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage}
        isOwner={isOwner} userLabel={userLabel} locale={locale}
      >
        {children}
      </AppShellPremium>
    );
  }

  return (
    <AppShell appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} isOwner={isOwner} locale={locale}>
      {children}
    </AppShell>
  );
}
