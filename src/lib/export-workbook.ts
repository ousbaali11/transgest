import * as XLSX from "xlsx";
import { prisma } from "./prisma";

function sanitizeSheetName(name: string, used: Set<string>): string {
  let n = (name || "Feuille").replace(/[:\\/?*[\]]/g, "-").trim().slice(0, 28) || "Feuille";
  let final = n;
  let i = 2;
  while (used.has(final)) {
    final = `${n}_${i}`;
    i++;
  }
  used.add(final);
  return final;
}

/**
 * Génère le classeur Excel complet d'une organisation : un onglet par
 * chauffeur (voyages, dépenses, formules Excel natives), plus un onglet
 * "Global" avec les totaux par chauffeur et par camion. Reprend la logique
 * du prototype, adaptée pour interroger la vraie base de données.
 */
export async function buildOrganizationWorkbook(organizationId: string, appName: string): Promise<Buffer> {
  const [trucks, drivers, clients, trips, expenses, customFieldDefs] = await Promise.all([
    prisma.truck.findMany({ where: { organizationId } }),
    prisma.driver.findMany({ where: { organizationId } }),
    prisma.client.findMany({ where: { organizationId } }),
    prisma.trip.findMany({ where: { organizationId }, orderBy: { date: "asc" } }),
    prisma.expense.findMany({ where: { organizationId } }),
    prisma.customFieldDefinition.findMany({ where: { organizationId, target: "TRIP" } }),
  ]);

  const truckName = (id: string | null) => trucks.find((t) => t.id === id)?.immat || "—";
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name || "—";
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name || "Non assigné";

  function tripCosts(tripId: string) {
    const es = expenses.filter((e) => e.tripId === tripId);
    const carburant = es.filter((e) => e.category === "CARBURANT").reduce((s, e) => s + Number(e.montant), 0);
    const peage = es.filter((e) => e.category === "PEAGE").reduce((s, e) => s + Number(e.montant), 0);
    const autres = es.filter((e) => e.category === "AUTRES").reduce((s, e) => s + Number(e.montant), 0);
    return { carburant, peage, autres, total: carburant + peage + autres };
  }

  const wb = XLSX.utils.book_new();
  const custom = customFieldDefs;
  const baseHeaders = [
    "DATE", "DÉPART", "ARRIVÉE", "CAMION", "CLIENT", "DISTANCE (KM)", "MARCHANDISE",
    "PRIX TRANSPORT", "AVANCE", "SOLDE", "CARBURANT", "PÉAGE", "AUTRES DÉP.",
    "TOTAL DÉP.", "BÉNÉFICE NET",
  ];
  const headers = [...baseHeaders, ...custom.map((c) => c.label.toUpperCase())];
  const col = (name: string) => headers.indexOf(name);
  const usedNames = new Set<string>();

  const driverIds: string[] = Array.from(new Set(trips.map((t) => t.driverId || "unassigned")));
  const driverSummaries: { driver: string; truck: string; voyages: number; ca: number; dep: number; km: number }[] = [];

  driverIds.forEach((driverId) => {
    const isUnassigned = driverId === "unassigned";
    const dName = isUnassigned ? "Non assigné" : driverName(driverId);
    const driverTrips = trips
      .filter((t) => (t.driverId || "unassigned") === driverId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const primaryTruck = trucks.find((t) => t.id === driverTrips[0]?.truckId);

    const rows: (string | number)[][] = [];
    rows.push(["CHAUFFEUR", dName]);
    rows.push(["CAMION", primaryTruck ? `${primaryTruck.immat}${primaryTruck.marque ? " — " + primaryTruck.marque + " " + (primaryTruck.modele || "") : ""}` : "—"]);
    rows.push([]);
    rows.push(headers);
    const headerRowIdx = rows.length - 1;

    driverTrips.forEach((trip) => {
      const costs = tripCosts(trip.id);
      const distance = (trip.kmArrivee || 0) - (trip.kmDepart || 0);
      const cf = (trip.customFields as Record<string, string | number>) || {};
      rows.push([
        trip.date.toISOString().slice(0, 10), trip.depart, trip.arrivee,
        truckName(trip.truckId), clientName(trip.clientId),
        distance || 0, trip.marchandise || "",
        Number(trip.prixTransport), Number(trip.avance), 0,
        costs.carburant, costs.peage, costs.autres, 0, 0,
        ...custom.map((c) => cf[c.id] ?? ""),
      ]);
    });

    const firstData = headerRowIdx + 1;
    const lastData = rows.length - 1;
    rows.push(["TOTAL", "", "", "", "", "", "", 0, 0, 0, 0, 0, 0, 0, 0, ...custom.map(() => "")]);
    const totalRow = rows.length - 1;

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    if (lastData >= firstData) {
      for (let r = firstData; r <= lastData; r++) {
        const H = XLSX.utils.encode_cell({ r, c: col("PRIX TRANSPORT") });
        const I = XLSX.utils.encode_cell({ r, c: col("AVANCE") });
        const J = XLSX.utils.encode_cell({ r, c: col("SOLDE") });
        const K = XLSX.utils.encode_cell({ r, c: col("CARBURANT") });
        const L = XLSX.utils.encode_cell({ r, c: col("PÉAGE") });
        const M = XLSX.utils.encode_cell({ r, c: col("AUTRES DÉP.") });
        const N = XLSX.utils.encode_cell({ r, c: col("TOTAL DÉP.") });
        const O = XLSX.utils.encode_cell({ r, c: col("BÉNÉFICE NET") });
        sheet[J] = { t: "n", f: `${H}-${I}` };
        sheet[N] = { t: "n", f: `${K}+${L}+${M}` };
        sheet[O] = { t: "n", f: `${H}-${N}` };
      }
      ["PRIX TRANSPORT", "AVANCE", "SOLDE", "CARBURANT", "PÉAGE", "AUTRES DÉP.", "TOTAL DÉP.", "BÉNÉFICE NET"].forEach((cname) => {
        const c = col(cname);
        const addr = XLSX.utils.encode_cell({ r: totalRow, c });
        const range = `${XLSX.utils.encode_cell({ r: firstData, c })}:${XLSX.utils.encode_cell({ r: lastData, c })}`;
        sheet[addr] = { t: "n", f: `SUM(${range})` };
      });
    }
    sheet["!cols"] = headers.map((h) => ({ wch: Math.max(12, Math.min(22, h.length + 4)) }));

    XLSX.utils.book_append_sheet(wb, sheet, sanitizeSheetName(dName, usedNames));

    const ca = driverTrips.reduce((s, t) => s + Number(t.prixTransport), 0);
    const dep = driverTrips.reduce((s, t) => s + tripCosts(t.id).total, 0);
    const km = driverTrips.reduce((s, t) => s + Math.max(0, (t.kmArrivee || 0) - (t.kmDepart || 0)), 0);
    driverSummaries.push({ driver: dName, truck: primaryTruck?.immat || "—", voyages: driverTrips.length, ca, dep, km });
  });

  const truckIds = Array.from(new Set(trips.map((t) => t.truckId).filter(Boolean))) as string[];
  const truckSummaries = truckIds.map((id) => {
    const tTrips = trips.filter((t) => t.truckId === id);
    const ca = tTrips.reduce((s, t) => s + Number(t.prixTransport), 0);
    const dep = tTrips.reduce((s, t) => s + tripCosts(t.id).total, 0);
    return { truck: truckName(id), voyages: tTrips.length, ca, dep };
  });

  const sum = (arr: Array<Record<string, unknown>>, key: string) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  const gRows: (string | number)[][] = [];
  gRows.push([`RAPPORT GLOBAL — ${appName}`]);
  gRows.push([`Généré le ${new Date().toLocaleDateString("fr-FR")}`]);
  gRows.push([]);
  gRows.push(["PAR CHAUFFEUR"]);
  gRows.push(["CHAUFFEUR", "CAMION", "VOYAGES", "CHIFFRE D'AFFAIRES", "DÉPENSES", "BÉNÉFICE NET", "DISTANCE (KM)", "BÉNÉFICE / KM"]);
  driverSummaries.forEach((s) => {
    gRows.push([s.driver, s.truck, s.voyages, s.ca, s.dep, s.ca - s.dep, s.km, s.km ? Math.round(((s.ca - s.dep) / s.km) * 100) / 100 : 0]);
  });
  gRows.push([
    "TOTAL", "", sum(driverSummaries, "voyages"), sum(driverSummaries, "ca"), sum(driverSummaries, "dep"),
    sum(driverSummaries, "ca") - sum(driverSummaries, "dep"), sum(driverSummaries, "km"), "",
  ]);
  gRows.push([]);
  gRows.push(["PAR CAMION"]);
  gRows.push(["CAMION", "VOYAGES", "CHIFFRE D'AFFAIRES", "DÉPENSES", "BÉNÉFICE NET"]);
  truckSummaries.forEach((s) => gRows.push([s.truck, s.voyages, s.ca, s.dep, s.ca - s.dep]));
  gRows.push(["TOTAL", sum(truckSummaries, "voyages"), sum(truckSummaries, "ca"), sum(truckSummaries, "dep"), sum(truckSummaries, "ca") - sum(truckSummaries, "dep")]);

  const gSheet = XLSX.utils.aoa_to_sheet(gRows);
  gSheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, gSheet, "Global");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
