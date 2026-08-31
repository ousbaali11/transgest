import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import NewTripForm from "./NewTripForm";

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default async function TripsPage() {
  const { org } = await requireActiveOrg();

  const [trips, trucks, drivers, clients] = await Promise.all([
    prisma.trip.findMany({
      where: { organizationId: org.id },
      include: { truck: true, driver: true, client: true, expenses: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
    prisma.driver.findMany({ where: { organizationId: org.id } }),
    prisma.client.findMany({ where: { organizationId: org.id } }),
  ]);

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Voyages</h1>

      <NewTripForm trucks={trucks} drivers={drivers} clients={clients} />

      {trips.length === 0 ? (
        <p className="muted">Aucun voyage enregistré.</p>
      ) : (
        trips.map((t) => {
          const totalDep = t.expenses.reduce((s, e) => s + Number(e.montant), 0);
          const benefice = Number(t.prixTransport) - totalDep;
          return (
            <div key={t.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{t.depart} → {t.arrivee}</strong>
                <span className="muted">{new Date(t.date).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="muted" style={{ margin: "4px 0" }}>{t.truck.immat} · {t.driver?.name || "Non assigné"} · {t.client?.name || "Sans client"}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t.marchandise || "—"}</span>
                <strong style={{ color: benefice >= 0 ? "#2e7d53" : "#c0392b" }}>{fmtDH(benefice)}</strong>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
