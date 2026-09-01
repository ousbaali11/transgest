import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

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
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
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

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const solde = data.prixTransport - data.avance;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.appName}>{data.appName}</Text>
          <View>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.invoiceMeta}>N° {data.number}</Text>
            <Text style={styles.invoiceMeta}>{fmtDate(data.date)}</Text>
            <Text style={[styles.statusBadge, { color: data.status === "PAYEE" ? "#2E7D53" : "#B5791C" }]}>
              {data.status === "PAYEE" ? "PAYÉE" : "EN ATTENTE"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Facturé à</Text>
          <Text style={styles.clientName}>{data.client?.name || "Client non renseigné"}</Text>
          {data.client?.address && <Text style={styles.clientLine}>{data.client.address}</Text>}
          {data.client?.phone && <Text style={styles.clientLine}>{data.client.phone}</Text>}
          {data.client?.email && <Text style={styles.clientLine}>{data.client.email}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Détails du voyage</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Départ</Text>
              <Text style={styles.tableValue}>{data.depart}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Arrivée</Text>
              <Text style={styles.tableValue}>{data.arrivee}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Camion</Text>
              <Text style={styles.tableValue}>{data.truckImmat}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Marchandise</Text>
              <Text style={styles.tableValue}>{data.marchandise || "—"}{data.quantite ? ` (${data.quantite} ${data.unite || ""})` : ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Prix du transport</Text>
            <Text>{fmtDH(data.prixTransport)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Avance reçue</Text>
            <Text>{fmtDH(data.avance)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={styles.totalsLabel}>Solde dû</Text>
            <Text style={styles.totalsValueFinal}>{fmtDH(solde)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Généré par {data.appName} le {fmtDate(new Date())}</Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />) as unknown as Promise<Buffer>;
}
