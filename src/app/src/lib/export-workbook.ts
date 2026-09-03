import ExcelJS from "exceljs";
import { prisma } from "./prisma";

// Palette claire, cohérente avec le thème de l'application (bleu marine /
// orange), pensée pour rester lisible et professionnelle à l'impression.
const COLORS = {
  headerFill: "FFE8EDF5", // bleu très clair
  headerText: "FF16305B", // bleu marine (couleur primaire de l'app)
  totalFill: "FFF1F1EF", // gris très clair
  positiveFill: "FFE4F3EA", // vert très clair
  positiveText: "FF2E7D53",
  negativeFill: "FFFBE9E7", // rouge très clair
  negativeText: "FFC0392B",
  sectionFill: "FFFDF1DF", // orange très clair, pour les titres de section
  sectionText: "FFB5791C",
  stripe: "FFFAFAF8", // presque blanc, pour une ligne sur deux
};

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

function fillCell(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

const MONEY_FORMAT = '#,##0.00" DH"';

/**
 * Génère le classeur Excel complet d'une organisation : un onglet par
 * chauffeur (voyages, dépenses, formules Excel natives, colorié), plus un
 * onglet "Global" avec les totaux par chauffeur et par camion.
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

  const wb = new ExcelJS.Workbook();
  wb.creator = appName;
  wb.created = new Date();

  const custom = customFieldDefs;
  // "#" en première colonne (numéro de ligne) et "NOTES" en dernière,
  // reprises de la structure de rapport fournie.
  const headers = [
    "#", "DATE", "DÉPART", "ARRIVÉE", "CAMION", "CLIENT", "DISTANCE (KM)", "MARCHANDISE",
    "PRIX TRANSPORT", "AVANCE", "SOLDE", "CARBURANT", "PÉAGE", "AUTRES DÉP.",
    "TOTAL DÉP.", "BÉNÉFICE NET", ...custom.map((c) => c.label.toUpperCase()), "NOTES",
  ];
  const col = (name: string) => headers.indexOf(name) + 1; // ExcelJS: colonnes indexées à partir de 1
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

    const sheet = wb.addWorksheet(sanitizeSheetName(dName, usedNames));

    // Bloc d'en-tête : chauffeur / camion
    sheet.getCell("A1").value = "CHAUFFEUR";
    sheet.getCell("A1").font = { bold: true };
    sheet.getCell("B1").value = dName;
    sheet.getCell("A2").value = "CAMION";
    sheet.getCell("A2").font = { bold: true };
    sheet.getCell("B2").value = primaryTruck
      ? `${primaryTruck.immat}${primaryTruck.marque ? " — " + primaryTruck.marque + " " + (primaryTruck.modele || "") : ""}`
      : "—";

    const headerRowIdx = 4;
    const headerRow = sheet.getRow(headerRowIdx);
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      fillCell(cell, COLORS.headerFill);
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    const firstData = headerRowIdx + 1;
    driverTrips.forEach((trip, i) => {
      const costs = tripCosts(trip.id);
      const distance = (trip.kmArrivee || 0) - (trip.kmDepart || 0);
      const cf = (trip.customFields as Record<string, string | number>) || {};
      const prix = Number(trip.prixTransport);
      const avance = Number(trip.avance);
      const totalDep = costs.total;
      const benefice = prix - totalDep;
      const r = firstData + i;
      const row = sheet.getRow(r);
      row.values = [
        i + 1, trip.date.toISOString().slice(0, 10), trip.depart, trip.arrivee,
        truckName(trip.truckId), clientName(trip.clientId),
        distance || 0, trip.marchandise || "",
        prix, avance, undefined, // SOLDE = formule, posée plus bas
        costs.carburant, costs.peage, costs.autres, undefined, undefined, // TOTAL DÉP. et BÉNÉFICE NET = formules
        ...custom.map((c) => cf[c.id] ?? ""),
        trip.notes || "",
      ];

      const H = sheet.getCell(r, col("PRIX TRANSPORT"));
      const I = sheet.getCell(r, col("AVANCE"));
      const J = sheet.getCell(r, col("SOLDE"));
      const K = sheet.getCell(r, col("CARBURANT"));
      const L = sheet.getCell(r, col("PÉAGE"));
      const M = sheet.getCell(r, col("AUTRES DÉP."));
      const N = sheet.getCell(r, col("TOTAL DÉP."));
      const O = sheet.getCell(r, col("BÉNÉFICE NET"));
      J.value = { formula: `${H.address}-${I.address}`, result: prix - avance };
      N.value = { formula: `${K.address}+${L.address}+${M.address}`, result: totalDep };
      O.value = { formula: `${H.address}-${N.address}`, result: benefice };

      [H, I, J, K, L, M, N, O].forEach((c) => (c.numFmt = MONEY_FORMAT));
      fillCell(O, benefice >= 0 ? COLORS.positiveFill : COLORS.negativeFill);
      O.font = { bold: true, color: { argb: benefice >= 0 ? COLORS.positiveText : COLORS.negativeText } };

      // Une ligne sur deux très légèrement teintée, pour la lisibilité
      // (sans écraser la couleur du bénéfice net déjà posée ci-dessus).
      if (i % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (cell.address !== O.address) fillCell(cell, COLORS.stripe);
        });
      }
    });

    const lastData = firstData + driverTrips.length - 1;
    const totalRowIdx = Math.max(lastData, firstData) + 1;
    const totalRow = sheet.getRow(totalRowIdx);
    totalRow.getCell(1).value = "TOTAL";
    if (lastData >= firstData) {
      ["PRIX TRANSPORT", "AVANCE", "SOLDE", "CARBURANT", "PÉAGE", "AUTRES DÉP.", "TOTAL DÉP.", "BÉNÉFICE NET"].forEach((cname) => {
        const c = col(cname);
        const cell = sheet.getCell(totalRowIdx, c);
        const colLetter = sheet.getColumn(c).letter;
        cell.value = { formula: `SUM(${colLetter}${firstData}:${colLetter}${lastData})`, result: 0 };
        cell.numFmt = MONEY_FORMAT;
      });
    }
    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      fillCell(cell, COLORS.totalFill);
      cell.font = { bold: true };
    });

    // Largeurs de colonnes : affectation directe (et non un .forEach sur
    // sheet.columns, qui reste vide tant qu'on ne l'a pas assigné — ce qui
    // provoquait des "###" à l'affichage faute de place pour les nombres).
    sheet.columns = headers.map((header) => ({
      width: header === "#" ? 12 : header === "NOTES" ? 30 : Math.max(14, Math.min(26, header.length + 6)),
    }));
    headerRow.height = 28;

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

  buildGlobalSheet(wb, appName, driverSummaries, truckSummaries);

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function buildGlobalSheet(
  wb: ExcelJS.Workbook,
  appName: string,
  driverSummaries: { driver: string; truck: string; voyages: number; ca: number; dep: number; km: number }[],
  truckSummaries: { truck: string; voyages: number; ca: number; dep: number }[]
) {
  const sheet = wb.addWorksheet("Global");
  const sum = (arr: Array<Record<string, unknown>>, key: string) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  sheet.getCell("A1").value = `RAPPORT GLOBAL — ${appName}`;
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: COLORS.headerText } };
  sheet.getCell("A2").value = `Généré le ${new Date().toLocaleDateString("fr-FR")}`;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF6B7280" } };

  let r = 4;
  sheet.getCell(`A${r}`).value = "PAR CHAUFFEUR";
  const sec1 = sheet.getRow(r);
  sec1.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.sectionFill);
    cell.font = { bold: true, color: { argb: COLORS.sectionText } };
  });
  r++;

  const driverHeaders = ["CHAUFFEUR", "CAMION", "VOYAGES", "CHIFFRE D'AFFAIRES", "DÉPENSES", "BÉNÉFICE NET", "DISTANCE (KM)", "BÉNÉFICE / KM"];
  const headerRow1 = sheet.getRow(r);
  headerRow1.values = driverHeaders;
  headerRow1.eachCell((cell) => {
    fillCell(cell, COLORS.headerFill);
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
  });
  r++;

  driverSummaries.forEach((s) => {
    const benefice = s.ca - s.dep;
    const row = sheet.getRow(r);
    row.values = [s.driver, s.truck, s.voyages, s.ca, s.dep, benefice, s.km, s.km ? Math.round((benefice / s.km) * 100) / 100 : 0];
    [4, 5, 6, 8].forEach((c) => (row.getCell(c).numFmt = MONEY_FORMAT));
    const beneficeCell = row.getCell(6);
    fillCell(beneficeCell, benefice >= 0 ? COLORS.positiveFill : COLORS.negativeFill);
    beneficeCell.font = { bold: true, color: { argb: benefice >= 0 ? COLORS.positiveText : COLORS.negativeText } };
    r++;
  });
  const driverTotalBenefice = sum(driverSummaries, "ca") - sum(driverSummaries, "dep");
  const totalRow1 = sheet.getRow(r);
  totalRow1.values = ["TOTAL", "", sum(driverSummaries, "voyages"), sum(driverSummaries, "ca"), sum(driverSummaries, "dep"), driverTotalBenefice, sum(driverSummaries, "km"), ""];
  totalRow1.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.totalFill);
    cell.font = { bold: true };
  });
  [4, 5, 6].forEach((c) => (totalRow1.getCell(c).numFmt = MONEY_FORMAT));
  r += 2;

  sheet.getCell(`A${r}`).value = "PAR CAMION";
  const sec2 = sheet.getRow(r);
  sec2.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.sectionFill);
    cell.font = { bold: true, color: { argb: COLORS.sectionText } };
  });
  r++;

  const truckHeaders = ["CAMION", "VOYAGES", "CHIFFRE D'AFFAIRES", "DÉPENSES", "BÉNÉFICE NET"];
  const headerRow2 = sheet.getRow(r);
  headerRow2.values = truckHeaders;
  headerRow2.eachCell((cell) => {
    fillCell(cell, COLORS.headerFill);
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
  });
  r++;

  truckSummaries.forEach((s) => {
    const benefice = s.ca - s.dep;
    const row = sheet.getRow(r);
    row.values = [s.truck, s.voyages, s.ca, s.dep, benefice];
    [3, 4, 5].forEach((c) => (row.getCell(c).numFmt = MONEY_FORMAT));
    const beneficeCell = row.getCell(5);
    fillCell(beneficeCell, benefice >= 0 ? COLORS.positiveFill : COLORS.negativeFill);
    beneficeCell.font = { bold: true, color: { argb: benefice >= 0 ? COLORS.positiveText : COLORS.negativeText } };
    r++;
  });
  const truckTotalBenefice = sum(truckSummaries, "ca") - sum(truckSummaries, "dep");
  const totalRow2 = sheet.getRow(r);
  totalRow2.values = ["TOTAL", sum(truckSummaries, "voyages"), sum(truckSummaries, "ca"), sum(truckSummaries, "dep"), truckTotalBenefice];
  totalRow2.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.totalFill);
    cell.font = { bold: true };
  });
  [3, 4, 5].forEach((c) => (totalRow2.getCell(c).numFmt = MONEY_FORMAT));

  sheet.columns = [{ width: 26 }, { width: 18 }, { width: 12 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }];
}
