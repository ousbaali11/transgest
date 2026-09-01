import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default async function TripBenefitPage({ params }: { params: { id: string } }) {
  const { org } = await requireActiveOrg();

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: { expenses: true, truck: true, driver: true, client: true, invoice: true },
  });
  if (!trip || trip.organizationId !== org.id) notFound();

  const totalDep = trip.expenses.reduce((s, e) => s + Number(e.montant), 0);
  const prix = Number(trip.prixTransport);
  const benefice = prix - totalDep;
  const distance = Math.max(0, (trip.kmArrivee || 0) - (trip.kmDepart || 0));
  const coutParKm = distance ? totalDep / distance : 0;
  const beneficeParKm = distance ? benefice / distance : 0;

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
        <Link href="/trips" style={{ color: "var(--text)" }}>←</Link>
        <h1 style={{ fontSize: 20 }}>Bénéfice</h1>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <span className="muted">Prix du voyage</span>
          <strong>{fmtDH(prix)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
          <span className="muted">Total des dépenses</span>
          <strong>{fmtDH(totalDep)}</strong>
        </div>
      </div>

      <div className="card" style={{ background: benefice >= 0 ? "#2E7D53" : "#C0392B", color: "#fff", textAlign: "center", padding: 20 }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>Bénéfice net</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmtDH(benefice)}</div>
      </div>

      <div className="card">
        <strong>Détails</strong>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
            <span className="muted">Distance parcourue</span>
            <span>{distance.toLocaleString("fr-FR")} km</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
            <span className="muted">Coût par km</span>
            <span>{fmtDH(coutParKm)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
            <span className="muted">Bénéfice par km</span>
            <span>{fmtDH(beneficeParKm)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <strong>Voyage</strong>
        <div style={{ marginTop: 10, fontSize: 14 }}>
          <div style={{ padding: "4px 0" }}>{trip.depart} → {trip.arrivee}</div>
          <div className="muted" style={{ padding: "4px 0" }}>{new Date(trip.date).toLocaleDateString("fr-FR")} · {trip.truck.immat} · {trip.driver?.name || "Non assigné"}</div>
          <div className="muted" style={{ padding: "4px 0" }}>{trip.client?.name || "Sans client"}</div>
        </div>
      </div>

      <Link href="/trips" className="btn btn-ghost" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
        Retour aux voyages
      </Link>
    </div>
  );
}
