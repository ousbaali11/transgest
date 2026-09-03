import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import { currencyForCountry, countryFromHeaders } from "@/lib/currency";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";
import SubscribeForm from "./SubscribeForm";

export default async function AbonnementPage({ searchParams }: { searchParams: { reason?: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");

  const settings = await getPlatformSettings();
  const plans = await prisma.plan.findMany({ where: { visible: true } });
  const availablePlans = settings.forcedPlanId ? plans.filter((p) => p.id === settings.forcedPlanId) : plans;

  const detectedCountry = org.countryCode || countryFromHeaders(headers());
  const currency = currencyForCountry(detectedCountry);
  const locale = getLocale();

  if (session.role === "DRIVER") {
    return (
      <div className="container">
        <h1 style={{ fontSize: 20, marginTop: 24, marginBottom: 4, textAlign: "center" }}>{t(locale, "subscription_inactive_title")}</h1>
        <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
          <p className="muted">
            {t(locale, "subscription_inactive_driver_desc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, marginTop: 24, marginBottom: 4, textAlign: "center" }}>
        {searchParams.reason === "expired" ? t(locale, "subscription_expired_title") : t(locale, "choose_plan_title")}
      </h1>
      <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
        {searchParams.reason === "expired"
          ? t(locale, "subscription_expired_desc")
          : t(locale, "choose_plan_desc")}
      </p>
      <SubscribeForm
        plans={JSON.parse(JSON.stringify(availablePlans))}
        initialCurrency={currency}
        stripeEnabled={settings.stripeEnabled}
        paypalEnabled={settings.paypalEnabled}
        locale={locale}
      />
    </div>
  );
}
