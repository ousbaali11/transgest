import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

function docAlerts(trucks: { immat: string; assuranceExpiry: Date | null; visiteTechniqueExpiry: Date | null; vignetteExpiry: Date | null }[]) {
  const today = new Date();
  const items: { truck: string; label: string; days: number }[] = [];
  trucks.forEach((t) => {
    ([["assuranceExpiry", "Assurance"], ["visiteTechniqueExpiry", "Visite technique"], ["vignetteExpiry", "Vignette"]] as const).forEach(([key, label]) => {
      const date = t[key];
      if (!date) return;
      const days = Math.ceil((date.getTime() - today.getTime()) / 86400000);
      if (days <= 30) items.push({ truck: t.immat, label, days });
    });
  });
  return items.sort((a, b) => a.days - b.days);
}

export default async function DashboardPage() {
  const { org, session } = await requireActiveOrg();
  const isOwner = session.role === "OWNER";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [trips, trucks] = await Promise.all([
    prisma.trip.findMany({
      where: { organizationId: org.id, date: { gte: monthStart } },
      include: { expenses: true, truck: true, driver: true },
      orderBy: { date: "desc" },
    }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
  ]);

  const ca = trips.reduce((s, t) => s + Number(t.prixTransport), 0);
  const dep = trips.reduce((s, t) => s + t.expenses.reduce((s2, e) => s2 + Number(e.montant), 0), 0);
  const benefice = ca - dep;
  const distanceTotale = trips.reduce((s, t) => s + Math.max(0, (t.kmArrivee || 0) - (t.kmDepart || 0)), 0);
  const alerts = docAlerts(trucks);

  const byDriver = new Map<string, { name: string; ca: number; dep: number; voyages: number }>();
  trips.forEach((t) => {
    const key = t.driverId || "unassigned";
    const name = t.driver?.name || "Non assigné";
    const cur = byDriver.get(key) || { name, ca: 0, dep: 0, voyages: 0 };
    cur.ca += Number(t.prixTransport);
    cur.dep += t.expenses.reduce((s, e) => s + Number(e.montant), 0);
    cur.voyages += 1;
    byDriver.set(key, cur);
  });
  const leaderboard = Array.from(byDriver.values())
    .map((d) => ({ ...d, benefice: d.ca - d.dep }))
    .sort((a, b) => b.benefice - a.benefice)
    .slice(0, 3);

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Bonjour 👋</h1>

      {isOwner && alerts.length > 0 && (
        <Link href="/flotte" className="card" style={{ display: "block", textDecoration: "none", background: "#FDF1DF", border: "1px solid #F0D9A8" }}>
          <strong style={{ color: "#7A5314" }}>⚠ {alerts.length} document(s) à renouveler</strong>
          <div style={{ color: "#8A6A2E", fontSize: 13, marginTop: 4 }}>
            {alerts.slice(0, 2).map((a) => `${a.truck} · ${a.label}`).join(" — ")}{alerts.length > 2 ? "…" : ""}
          </div>
        </Link>
      )}

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
        <div className="stat-card" style={{ background: "#fff", color: "var(--text)", border: "1px solid var(--line)" }}>
          <div className="label" style={{ color: "var(--muted)" }}>Distance parcourue</div>
          <div className="value">{distanceTotale.toLocaleString("fr-FR")} km</div>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div className="card">
          <strong>Classement chauffeurs — ce mois</strong>
          <div style={{ marginTop: 10 }}>
            {leaderboard.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i === 0 ? "var(--accent)" : "var(--primary-10)", color: i === 0 ? "#fff" : "var(--primary)" }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>{d.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{d.voyages} voyage(s)</div>
                </div>
                <strong style={{ color: d.benefice >= 0 ? "#2e7d53" : "#c0392b" }}>{fmtDH(d.benefice)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

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
