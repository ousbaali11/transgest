import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import { currencyForCountry, countryFromHeaders } from "@/lib/currency";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import { isOrgActive } from "@/lib/require-active-org";
import LandingHeader from "@/components/LandingHeader";
import SubscribeForm from "./SubscribeForm";

export default async function AbonnementPage({ searchParams }: { searchParams: { reason?: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");

  // Sans cette vérification, la page se contentait d'afficher "verrouillé"
  // ou "expiré" indéfiniment d'après le paramètre ?reason= figé au moment
  // de la redirection initiale — jamais réévalué ensuite. Un compte
  // débloqué entre-temps (déverrouillé, abonnement offert...) restait donc
  // bloqué sur cette page jusqu'à ce qu'on navigue ailleurs, même après un
  // vrai rechargement complet. Ici, on revérifie l'état réel à chaque
  // chargement et on renvoie vers le tableau de bord si tout est en ordre.
  if (isOrgActive(org)) redirect("/dashboard");

  const settings = await getPlatformSettings();
  const plans = await prisma.plan.findMany({ where: { visible: true } });
  const availablePlans = settings.forcedPlanId ? plans.filter((p) => p.id === settings.forcedPlanId) : plans;

  const detectedCountry = org.countryCode || countryFromHeaders(headers());
  const currency = currencyForCountry(detectedCountry);
  const locale = getLocale();
  const isManualPaymentCountry = !!detectedCountry && settings.manualPaymentCountries.includes(detectedCountry);

  if (session.role === "DRIVER") {
    return (
      <div style={{ minHeight: "100vh" }}>
        <LandingHeader appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} locale={locale} logoutRedirectTo="/login" />
        <div className="container">
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
    <div style={{ minHeight: "100vh" }}>
      <LandingHeader appName={settings.appName} logoEmoji={settings.logoEmoji} logoType={settings.logoType} logoImage={settings.logoImage} locale={locale} logoutRedirectTo="/login" />
      <div className="container">
        <h1 style={{ fontSize: 20, marginTop: 24, marginBottom: 4, textAlign: "center" }}>
          {searchParams.reason === "locked" ? t(locale, "account_locked_title") : searchParams.reason === "expired" ? t(locale, "subscription_expired_title") : t(locale, "choose_plan_title")}
        </h1>
        <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
          {searchParams.reason === "locked"
            ? t(locale, "account_locked_desc")
            : searchParams.reason === "expired"
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
