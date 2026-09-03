import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import { getLocale } from "@/lib/get-locale";
import { t as tr } from "@/lib/i18n";
import NewTripForm from "./NewTripForm";
import TripCard from "./TripCard";

export default async function TripsPage() {
  const { org, session } = await requireActiveOrg();
  const currentDriverId = session.role === "DRIVER" ? session.driverId : null;
  const currentUserId = session.userId;
  const locale = getLocale();

  const [trips, trucks, drivers, clients, customFields] = await Promise.all([
    prisma.trip.findMany({
      where: { organizationId: org.id },
      include: { truck: true, driver: true, client: true, expenses: true, invoice: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
    prisma.driver.findMany({ where: { organizationId: org.id } }),
    prisma.client.findMany({ where: { organizationId: org.id } }),
    prisma.customFieldDefinition.findMany({ where: { organizationId: org.id, target: "TRIP" } }),
  ]);

  const trucksPlain = JSON.parse(JSON.stringify(trucks));
  const driversPlain = JSON.parse(JSON.stringify(drivers));
  const clientsPlain = JSON.parse(JSON.stringify(clients));
  const customFieldsPlain = JSON.parse(JSON.stringify(customFields));

  return (
    <div className="container">
      <ScreenHeader title={tr(locale, "nav_trips")} />

      <NewTripForm trucks={trucksPlain} drivers={driversPlain} clients={clientsPlain} customFields={customFieldsPlain} lockedDriverId={currentDriverId} locale={locale} />

      {trips.length === 0 ? (
        <p className="muted">{tr(locale, "trips_empty")}</p>
      ) : (
        trips.map((t) => {
          const totalDep = t.expenses.reduce((s, e) => s + Number(e.montant), 0);
          const benefice = Number(t.prixTransport) - totalDep;
          return (
            <TripCard
              key={t.id}
              trip={JSON.parse(JSON.stringify({
                id: t.id, date: t.date, depart: t.depart, arrivee: t.arrivee, marchandise: t.marchandise,
                truckId: t.truckId, driverId: t.driverId, clientId: t.clientId,
                kmDepart: t.kmDepart, kmArrivee: t.kmArrivee, createdByUserId: t.createdByUserId,
                prixTransport: Number(t.prixTransport), avance: Number(t.avance), customFields: t.customFields,
              }))}
              benefice={benefice}
              truckLabel={t.truck.immat}
              driverLabel={t.driver?.name || tr(locale, "not_assigned")}
              clientLabel={t.client?.name || tr(locale, "no_client")}
              invoice={t.invoice ? { id: t.invoice.id, number: t.invoice.number, status: t.invoice.status } : null}
              trucks={trucksPlain}
              drivers={driversPlain}
              clients={clientsPlain}
              customFields={customFieldsPlain}
              currentDriverId={currentDriverId}
              currentUserId={currentUserId}
              locale={locale}
            />
          );
        })
      )}
    </div>
  );
}
