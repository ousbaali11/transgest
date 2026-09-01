import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPlatformSettings } from "@/lib/settings";
import { currencyForCountry, countryFromHeaders } from "@/lib/currency";
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

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, marginTop: 24, marginBottom: 4, textAlign: "center" }}>
        {searchParams.reason === "expired" ? "Votre abonnement a expiré" : "Choisissez votre formule"}
      </h1>
      <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
        {searchParams.reason === "expired"
          ? "Renouvelez pour retrouver l'accès à vos voyages, dépenses et factures."
          : "Un abonnement actif est nécessaire pour accéder à l'application."}
      </p>
      <SubscribeForm plans={availablePlans} initialCurrency={currency} />
    </div>
  );
}
