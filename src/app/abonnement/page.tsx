import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getValidSession, loadOrg } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/settings";
import { currencyForCountry, countryFromHeaders } from "@/lib/currency";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { isOrgActive, inactiveReason } from "@/lib/require-active-org";
import LandingHeader from "@/components/LandingHeader";
import { themeClass } from "@/lib/ui-theme";
import SubscribeForm from "./SubscribeForm";

export default async function AbonnementPage() {
  const session = await getValidSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) redirect("/login");

  // Organisation déjà rapportée avec la session pour un chauffeur (jointure) :
  // pas de seconde lecture.
  const org = await loadOrg(session);
  if (!org) redirect("/login");

  // Sans cette vérification, la page se contentait d'afficher "verrouillé"
  // ou "expiré" indéfiniment d'après le paramètre ?reason= figé au moment
  // de la redirection initiale — jamais réévalué ensuite. Un compte
  // débloqué entre-temps (déverrouillé, abonnement offert...) restait donc
  // bloqué sur cette page jusqu'à ce qu'on navigue ailleurs, même après un
  // vrai rechargement complet. Ici, on revérifie l'état réel à chaque
  // chargement et on renvoie vers le tableau de bord si tout est en ordre.
  if (isOrgActive(org)) redirect("/dashboard");
  // Le titre suit lui aussi l'état RÉEL (verrou levé mais abonnement
  // expiré, par exemple), et non le ?reason= de l'URL, qui peut être
  // périmé ou forgé.
  const reason = inactiveReason(org);

  const settings = await getPlatformSettings();
  const plans = await prisma.plan.findMany({ where: { visible: true } });
  const availablePlans = settings.forcedPlanId ? plans.filter((p) => p.id === settings.forcedPlanId) : plans;

  const detectedCountry = org.countryCode || countryFromHeaders(headers());
  const currency = currencyForCountry(detectedCountry);
  const locale = getLocale();
  const isManualPaymentCountry = !!detectedCountry && settings.manualPaymentCountries.includes(detectedCountry);

  if (session.role === "DRIVER") {
    return (
      <div className={themeClass(settings.uiTheme)} style={{ minHeight: "100vh" }}>
        <LandingHeader appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} locale={locale} uiTheme={settings.uiTheme} logoutRedirectTo="/login" />
        <div className="container pm-narrow">
          <h1 style={{ fontSize: 20, marginTop: 24, marginBottom: 4, textAlign: "center" }}>{t(locale, "subscription_inactive_title")}</h1>
          <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
            <p className="muted">
              {t(locale, "subscription_inactive_driver_desc")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={themeClass(settings.uiTheme)} style={{ minHeight: "100vh" }}>
      <LandingHeader appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} locale={locale} uiTheme={settings.uiTheme} logoutRedirectTo="/login" />
      <div className="container pm-narrow">
        <h1 style={{ fontSize: 20, marginTop: 24, marginBottom: 4, textAlign: "center" }}>
          {reason === "locked" ? t(locale, "account_locked_title") : reason === "expired" ? t(locale, "subscription_expired_title") : t(locale, "choose_plan_title")}
        </h1>
        <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
          {reason === "locked"
            ? t(locale, "account_locked_desc")
            : reason === "expired"
            ? t(locale, "subscription_expired_desc")
            : t(locale, "choose_plan_desc")}
        </p>
        <SubscribeForm
          plans={JSON.parse(JSON.stringify(availablePlans))}
          initialCurrency={currency}
          stripeEnabled={settings.stripeEnabled}
          paypalEnabled={settings.paypalEnabled}
          isManualPaymentCountry={isManualPaymentCountry}
          contactEmail={settings.contactEmail}
          contactWhatsapp={settings.contactWhatsapp}
          locale={locale}
        />
      </div>
    </div>
  );
}
