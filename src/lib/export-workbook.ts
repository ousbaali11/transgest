import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { t, dateLocale, type Locale, type TKey } from "./i18n";

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

function sanitizeSheetName(name: string, fallback: string, used: Set<string>): string {
  const n = (name || fallback).replace(/[:\\/?*[\]]/g, "-").trim().slice(0, 28) || fallback;
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

// Colonnes de l'onglet chauffeur, identifiées par une clé stable (et non par
// leur libellé traduit) pour que les formules pointent toujours sur la
// bonne colonne quelle que soit la langue du rapport.
type ColKey =
  | "index" | "date" | "departure" | "arrival" | "truck" | "client" | "distance" | "merchandise"
  | "price" | "advance" | "balance" | "fuel" | "toll" | "other" | "totalExp" | "profit";
const BASE_COLUMNS: { key: ColKey; label: TKey }[] = [
  { key: "index", label: "xl_total" }, // libellé remplacé par "#" ci-dessous
  { key: "date", label: "xl_date" },
  { key: "departure", label: "xl_departure" },
  { key: "arrival", label: "xl_arrival" },
  { key: "truck", label: "xl_truck" },
  { key: "client", label: "xl_client" },
  { key: "distance", label: "xl_distance" },
  { key: "merchandise", label: "xl_merchandise" },
  { key: "price", label: "xl_transport_price" },
  { key: "advance", label: "xl_advance" },
  { key: "balance", label: "xl_balance" },
  { key: "fuel", label: "xl_fuel" },
  { key: "toll", label: "xl_toll" },
  { key: "other", label: "xl_other_expenses" },
  { key: "totalExp", label: "xl_total_expenses" },
  { key: "profit", label: "xl_net_profit" },
];

/**
 * Langue du classeur : TOUJOURS le français, quelle que soit la langue
 * choisie sur le site (décision produit : le rapport est destiné au
 * comptable / aux documents officiels). Les clés xl_* restent traduites
 * dans le dictionnaire, mais seule la version française est utilisée ici.
 * Ne pas réintroduire de paramètre de langue.
 */
const EXPORT_LOCALE: Locale = "fr";

/**
 * Génère le classeur Excel complet d'une organisation : un onglet par
 * chauffeur (voyages, dépenses, formules Excel natives, colorié), plus un
 * onglet "Global" avec les totaux par chauffeur et par camion — en
 * français (voir EXPORT_LOCALE).
 */
export async function buildOrganizationWorkbook(organizationId: string, appName: string): Promise<Buffer> {
  const locale = EXPORT_LOCALE;
  const tr = (key: TKey) => t(locale, key);
  const [trucks, drivers, clients, trips, expenses, customFieldDefs] = await Promise.all([
    prisma.truck.findMany({ where: { organizationId } }),
    prisma.driver.findMany({ where: { organizationId } }),
    prisma.client.findMany({ where: { organizationId } }),
    prisma.trip.findMany({ where: { organizationId }, orderBy: { date: "asc" } }),
    prisma.expense.findMany({ where: { organizationId } }),
    prisma.customFieldDefinition.findMany({ where: { organizationId, target: "TRIP" } }),
  ]);

  const unassignedLabel = tr("xl_unassigned");
  const truckName = (id: string | null) => trucks.find((x) => x.id === id)?.immat || "—";
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name || "—";
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name || unassignedLabel;

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
  // reprises de la structure de rapport fournie ; les colonnes
  // personnalisées de l'organisation s'intercalent avant les notes.
  const headers = [
    ...BASE_COLUMNS.map((c) => (c.key === "index" ? "#" : tr(c.label))),
    ...custom.map((c) => c.label.toUpperCase()),
    tr("xl_notes"),
  ];
  const col = (key: ColKey) => BASE_COLUMNS.findIndex((c) => c.key === key) + 1; // ExcelJS: colonnes indexées à partir de 1
  const usedNames = new Set<string>();

  const driverIds: string[] = Array.from(new Set(trips.map((x) => x.driverId || "unassigned")));
  const driverSummaries: { driver: string; truck: string; voyages: number; ca: number; dep: number; km: number }[] = [];

  driverIds.forEach((driverId) => {
    const isUnassigned = driverId === "unassigned";
    const dName = isUnassigned ? unassignedLabel : driverName(driverId);
    const driverTrips = trips
      .filter((x) => (x.driverId || "unassigned") === driverId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const primaryTruck = trucks.find((x) => x.id === driverTrips[0]?.truckId);

    const sheet = wb.addWorksheet(sanitizeSheetName(dName, tr("xl_sheet_default"), usedNames));

    // Bloc d'en-tête : chauffeur / camion
    sheet.getCell("A1").value = tr("xl_driver");
    sheet.getCell("A1").font = { bold: true };
    sheet.getCell("B1").value = dName;
    sheet.getCell("A2").value = tr("xl_truck");
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
      const distance = trip.distanceKm || 0;
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

      const H = sheet.getCell(r, col("price"));
      const I = sheet.getCell(r, col("advance"));
      const J = sheet.getCell(r, col("balance"));
      const K = sheet.getCell(r, col("fuel"));
      const L = sheet.getCell(r, col("toll"));
      const M = sheet.getCell(r, col("other"));
      const N = sheet.getCell(r, col("totalExp"));
      const O = sheet.getCell(r, col("profit"));
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
    totalRow.getCell(1).value = tr("xl_total");
    if (lastData >= firstData) {
      (["price", "advance", "balance", "fuel", "toll", "other", "totalExp", "profit"] as ColKey[]).forEach((key) => {
        const c = col(key);
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
    sheet.columns = headers.map((header, idx) => ({
      width: idx === 0 ? 12 : idx === headers.length - 1 ? 30 : Math.max(14, Math.min(26, header.length + 6)),
    }));
    headerRow.height = 28;

    const ca = driverTrips.reduce((s, x) => s + Number(x.prixTransport), 0);
    const dep = driverTrips.reduce((s, x) => s + tripCosts(x.id).total, 0);
    const km = driverTrips.reduce((s, x) => s + (x.distanceKm || 0), 0);
    driverSummaries.push({ driver: dName, truck: primaryTruck?.immat || "—", voyages: driverTrips.length, ca, dep, km });
  });

  const truckIds = Array.from(new Set(trips.map((x) => x.truckId).filter(Boolean))) as string[];
  const truckSummaries = truckIds.map((id) => {
    const tTrips = trips.filter((x) => x.truckId === id);
    const ca = tTrips.reduce((s, x) => s + Number(x.prixTransport), 0);
    const dep = tTrips.reduce((s, x) => s + tripCosts(x.id).total, 0);
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
  const locale = EXPORT_LOCALE;
  const tr = (key: TKey) => t(locale, key);
  const sheet = wb.addWorksheet(tr("xl_global_sheet"));
  const sum = (arr: Array<Record<string, unknown>>, key: string) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  sheet.getCell("A1").value = `${tr("xl_global_report")} — ${appName}`;
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: COLORS.headerText } };
  sheet.getCell("A2").value = `${tr("xl_generated_on")} ${new Date().toLocaleDateString(dateLocale(locale))}`;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF6B7280" } };

  let r = 4;
  sheet.getCell(`A${r}`).value = tr("xl_by_driver");
  const sec1 = sheet.getRow(r);
  sec1.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.sectionFill);
    cell.font = { bold: true, color: { argb: COLORS.sectionText } };
  });
  r++;

  const driverHeaders = [tr("xl_driver"), tr("xl_truck"), tr("xl_trips"), tr("xl_revenue"), tr("xl_expenses"), tr("xl_net_profit"), tr("xl_distance"), tr("xl_profit_per_km")];
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
  totalRow1.values = [tr("xl_total"), "", sum(driverSummaries, "voyages"), sum(driverSummaries, "ca"), sum(driverSummaries, "dep"), driverTotalBenefice, sum(driverSummaries, "km"), ""];
  totalRow1.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.totalFill);
    cell.font = { bold: true };
  });
  [4, 5, 6].forEach((c) => (totalRow1.getCell(c).numFmt = MONEY_FORMAT));
  r += 2;

  sheet.getCell(`A${r}`).value = tr("xl_by_truck");
  const sec2 = sheet.getRow(r);
  sec2.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.sectionFill);
    cell.font = { bold: true, color: { argb: COLORS.sectionText } };
  });
  r++;

  const truckHeaders = [tr("xl_truck"), tr("xl_trips"), tr("xl_revenue"), tr("xl_expenses"), tr("xl_net_profit")];
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
  totalRow2.values = [tr("xl_total"), sum(truckSummaries, "voyages"), sum(truckSummaries, "ca"), sum(truckSummaries, "dep"), truckTotalBenefice];
  totalRow2.eachCell({ includeEmpty: true }, (cell) => {
    fillCell(cell, COLORS.totalFill);
    cell.font = { bold: true };
  });
  [3, 4, 5].forEach((c) => (totalRow2.getCell(c).numFmt = MONEY_FORMAT));

  sheet.columns = [{ width: 26 }, { width: 18 }, { width: 12 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }];
}
