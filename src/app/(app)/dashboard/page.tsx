import Link from "next/link";
import { Route, Wallet, Fuel, TrendingUp, BarChart3, Gauge, Receipt, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import RevenueChart from "@/components/RevenueChart";
import SeedDemoButton from "./SeedDemoButton";

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
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
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [trips6mo, expenses6mo, trucks, totalTripsCount, recentTrips] = await Promise.all([
    prisma.trip.findMany({
      where: { organizationId: org.id, date: { gte: sixMonthsAgoStart } },
      include: { driver: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({ where: { organizationId: org.id, date: { gte: sixMonthsAgoStart } } }),
    prisma.truck.findMany({ where: { organizationId: org.id } }),
    prisma.trip.count({ where: { organizationId: org.id } }),
    prisma.trip.findMany({
      where: { organizationId: org.id },
      include: { truck: true, driver: true },
      orderBy: { date: "desc" },
      take: 4,
    }),
  ]);

  const monthTrips = trips6mo.filter((t) => t.date >= monthStart);
  const monthExpenses = expenses6mo.filter((e) => e.date >= monthStart);

  const ca = monthTrips.reduce((s, t) => s + Number(t.prixTransport), 0);
  const dep = monthExpenses.reduce((s, e) => s + Number(e.montant), 0);
  const benefice = ca - dep;
  const distanceMonth = monthTrips.reduce((s, t) => s + Math.max(0, (t.kmArrivee || 0) - (t.kmDepart || 0)), 0);
  const carburantLMonth = monthExpenses.filter((e) => e.category === "CARBURANT").reduce((s, e) => s + (e.quantite || 0), 0);
  const facturesMonth = await prisma.invoice.count({ where: { organizationId: org.id, date: { gte: monthStart } } });
  const alerts = docAlerts(trucks);

  // Graphique CA vs Dépenses des 6 derniers mois
  const buckets: { key: string; label: string; ca: number; dep: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), ca: 0, dep: 0 });
  }
  trips6mo.forEach((t) => {
    const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.ca += Number(t.prixTransport);
  });
  expenses6mo.forEach((e) => {
    const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.dep += Number(e.montant);
  });

  // Classement chauffeurs — ce mois
  const byDriver = new Map<string, { name: string; ca: number; dep: number; voyages: number }>();
  monthTrips.forEach((t) => {
    const key = t.driverId || "unassigned";
    const name = t.driver?.name || "Non assigné";
    const cur = byDriver.get(key) || { name, ca: 0, dep: 0, voyages: 0 };
    cur.ca += Number(t.prixTransport);
    cur.voyages += 1;
    byDriver.set(key, cur);
  });
  monthExpenses.forEach((e) => {
    const key = e.driverId || "unassigned";
    const cur = byDriver.get(key);
    if (cur) cur.dep += Number(e.montant);
  });
  const leaderboard = Array.from(byDriver.values())
    .map((d) => ({ ...d, benefice: d.ca - d.dep }))
    .sort((a, b) => b.benefice - a.benefice)
    .slice(0, 3);

  const hasData = totalTripsCount > 0;

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Bonjour 👋</h1>
      <p className="muted" style={{ marginTop: -14, marginBottom: 16 }}>Voici le résumé de votre activité</p>

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="label">Voyages ce mois</div>
            <Route size={15} style={{ opacity: 0.85 }} />
          </div>
          <div className="value">{monthTrips.length}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="label">Chiffre d'affaires</div>
            <Wallet size={15} style={{ opacity: 0.85 }} />
          </div>
          <div className="value">{fmtDH(ca)}</div>
        </div>
        <div className="stat-card" style={{ background: "#fff", color: "var(--text)", border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="label" style={{ color: "var(--muted)" }}>Dépenses totales</div>
            <Fuel size={15} color="var(--muted)" />
          </div>
          <div className="value">{fmtDH(dep)}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="label">Bénéfice net</div>
            <TrendingUp size={15} style={{ opacity: 0.85 }} />
          </div>
          <div className="value">{fmtDH(benefice)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong>Chiffre d'affaires vs dépenses</strong>
          <BarChart3 size={15} color="var(--muted)" />
        </div>
        <RevenueChart data={buckets} />
      </div>

      <div className="card">
        <strong>Aperçu rapide</strong>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Gauge size={15} color="var(--primary)" />
            </div>
            <span style={{ flex: 1, fontSize: 14 }}>Distance parcourue</span>
            <strong style={{ fontSize: 14 }}>{distanceMonth.toLocaleString("fr-FR")} km</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Fuel size={15} color="var(--primary)" />
            </div>
            <span style={{ flex: 1, fontSize: 14 }}>Carburant consommé</span>
            <strong style={{ fontSize: 14 }}>{carburantLMonth.toLocaleString("fr-FR")} L</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Receipt size={15} color="var(--primary)" />
            </div>
            <span style={{ flex: 1, fontSize: 14 }}>Factures émises</span>
            <strong style={{ fontSize: 14 }}>{facturesMonth}</strong>
          </div>
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Voyages récents</strong>
        {hasData && <Link href="/trips" style={{ fontSize: 12, fontWeight: 600 }}>Voir tout</Link>}
      </div>

      {!hasData ? (
        <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: 999, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Route size={22} color="var(--primary)" />
          </div>
          <strong style={{ display: "block", marginBottom: 6 }}>Aucun voyage enregistré</strong>
          <p className="muted" style={{ marginBottom: 16 }}>
            Ajoutez votre premier voyage pour commencer à suivre votre activité, ou chargez un exemple pour
            explorer l&apos;application.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/trips" className="btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
              <Plus size={15} /> Nouveau voyage
            </Link>
            {isOwner && <SeedDemoButton />}
          </div>
        </div>
      ) : (
        recentTrips.map((t) => (
          <div key={t.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.depart} → {t.arrivee}</div>
              <div className="muted">{t.date.toLocaleDateString("fr-FR")} · {t.driver?.name || "Non assigné"}</div>
            </div>
            <strong>{fmtDH(Number(t.prixTransport))}</strong>
          </div>
        ))
      )}
    </div>
  );
}
