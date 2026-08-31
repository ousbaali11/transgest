import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default async function DashboardPage() {
  const { org } = await requireActiveOrg();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const trips = await prisma.trip.findMany({
    where: { organizationId: org.id, date: { gte: monthStart } },
    include: { expenses: true, truck: true, driver: true },
    orderBy: { date: "desc" },
  });

  const ca = trips.reduce((s, t) => s + Number(t.prixTransport), 0);
  const dep = trips.reduce((s, t) => s + t.expenses.reduce((s2, e) => s2 + Number(e.montant), 0), 0);
  const benefice = ca - dep;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0" }}>
        <h1 style={{ fontSize: 20 }}>Bonjour 👋</h1>
        <nav style={{ display: "flex", gap: 12, fontSize: 13 }}>
          <Link href="/trips">Voyages</Link>
          <Link href="/reglages">Réglages</Link>
        </nav>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Voyages ce mois</div>
          <div className="value">{trips.length}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--accent)" }}>
          <div className="label">Chiffre d'affaires</div>
          <div className="value">{fmtDH(ca)}</div>
        </div>
        <div className="stat-card" style={{ background: "#fff", color: "var(--text)", border: "1px solid var(--line)" }}>
          <div className="label" style={{ color: "var(--muted)" }}>Dépenses</div>
          <div className="value">{fmtDH(dep)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Bénéfice net</div>
          <div className="value">{fmtDH(benefice)}</div>
        </div>
      </div>

      <div className="card">
        <strong>Voyages récents</strong>
        {trips.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>Aucun voyage ce mois-ci. <Link href="/trips">Ajouter un voyage →</Link></p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {trips.slice(0, 5).map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <div>
                  <div>{t.depart} → {t.arrivee}</div>
                  <div className="muted">{t.truck.immat} · {t.driver?.name || "Non assigné"}</div>
                </div>
                <strong>{fmtDH(Number(t.prixTransport))}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
