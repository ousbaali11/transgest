import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { t, type Locale } from "./i18n";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1B2430" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  appName: { fontSize: 18, fontWeight: 700, color: "#16305B" },
  invoiceTitle: { fontSize: 22, fontWeight: 700, textAlign: "right" },
  invoiceMeta: { fontSize: 10, color: "#6B7280", textAlign: "right", marginTop: 4 },
  statusBadge: { fontSize: 10, fontWeight: 700, marginTop: 6, textAlign: "right" },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 },
  clientName: { fontSize: 13, fontWeight: 700 },
  clientLine: { fontSize: 10, color: "#374151", marginTop: 2 },
  table: { borderTop: "1 solid #E7E3DA", borderBottom: "1 solid #E7E3DA", marginTop: 8, marginBottom: 18 },
  tableRow: { flexDirection: "row", paddingVertical: 8, borderBottom: "1 solid #F1F1EF" },
  tableLabel: { flex: 1, color: "#6B7280" },
  tableValue: { flex: 1, textAlign: "right" },
  totalsBox: { alignSelf: "flex-end", width: 220, marginTop: 8 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalsRowFinal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "1 solid #1B2430" },
  totalsLabel: { color: "#6B7280" },
  totalsValueFinal: { fontWeight: 700, fontSize: 13 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9CA3AF", textAlign: "center" },
});

/**
 * La police embarquée par défaut (Helvetica) ne contient aucun glyphe
 * arabe : un PDF "en darija" afficherait des carrés. Le document est donc
 * rendu en anglais quand la langue choisie est l'anglais, en français dans
 * tous les autres cas — une facture reste de toute façon un document
 * administratif rédigé en français au Maroc.
 */
type PdfLocale = "fr" | "en";
function pdfLocale(locale: Locale): PdfLocale {
  return locale === "en" ? "en" : "fr";
}

function fmtDH(n: number) {
  // toLocaleString dépend des données ICU disponibles dans l'environnement Node
  // au moment du rendu PDF, ce qui peut donner un séparateur incorrect selon
  // la plateforme — on formate donc manuellement pour un résultat fiable partout.
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, dec] = fixed.split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "-" : ""}${withSpaces},${dec} DH`;
}
function fmtDate(d: Date) {
  // Même principe que fmtDH : formatage manuel (JJ/MM/AAAA, identique en
  // français et en anglais britannique), indépendant des données ICU.
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export type InvoicePdfData = {
  appName: string;
  number: string;
  date: Date;
  status: "EN_ATTENTE" | "PAYEE";
  client: { name: string; phone: string | null; email: string | null; address: string | null } | null;
  depart: string;
  arrivee: string;
  marchandise: string | null;
  quantite: number | null;
  unite: string | null;
  truckImmat: string;
  prixTransport: number;
  avance: number;
};

function InvoiceDocument({ data, locale }: { data: InvoicePdfData; locale: PdfLocale }) {
  const solde = data.prixTransport - data.avance;
  const tr = (key: Parameters<typeof t>[1]) => t(locale, key);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.appName}>{data.appName}</Text>
          <View>
            <Text style={styles.invoiceTitle}>{tr("pdf_invoice")}</Text>
            <Text style={styles.invoiceMeta}>{tr("pdf_number")} {data.number}</Text>
            <Text style={styles.invoiceMeta}>{fmtDate(data.date)}</Text>
            <Text style={[styles.statusBadge, { color: data.status === "PAYEE" ? "#2E7D53" : "#B5791C" }]}>
              {data.status === "PAYEE" ? tr("pdf_paid") : tr("pdf_pending")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{tr("pdf_billed_to")}</Text>
          <Text style={styles.clientName}>{data.client?.name || tr("pdf_no_client")}</Text>
          {data.client?.address && <Text style={styles.clientLine}>{data.client.address}</Text>}
          {data.client?.phone && <Text style={styles.clientLine}>{data.client.phone}</Text>}
          {data.client?.email && <Text style={styles.clientLine}>{data.client.email}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{tr("pdf_trip_details")}</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{tr("pdf_departure")}</Text>
              <Text style={styles.tableValue}>{data.depart}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{tr("pdf_arrival")}</Text>
              <Text style={styles.tableValue}>{data.arrivee}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{tr("pdf_truck")}</Text>
              <Text style={styles.tableValue}>{data.truckImmat}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{tr("pdf_goods")}</Text>
              <Text style={styles.tableValue}>{data.marchandise || "—"}{data.quantite ? ` (${data.quantite} ${data.unite || ""})` : ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{tr("pdf_transport_price")}</Text>
            <Text>{fmtDH(data.prixTransport)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{tr("pdf_advance")}</Text>
            <Text>{fmtDH(data.avance)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={styles.totalsLabel}>{tr("pdf_balance_due")}</Text>
            <Text style={styles.totalsValueFinal}>{fmtDH(solde)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {tr("pdf_generated_by").replace("{app}", data.appName).replace("{date}", fmtDate(new Date()))}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoicePdfData, locale: Locale): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} locale={pdfLocale(locale)} />) as unknown as Promise<Buffer>;
}
