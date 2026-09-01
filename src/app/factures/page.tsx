import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import InvoiceStatusToggle from "./InvoiceStatusToggle";

function fmtDH(n: number) {
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

const TABS = [
  { key: "all", label: "Toutes" },
  { key: "PAYEE", label: "Payées" },
  { key: "EN_ATTENTE", label: "En attente" },
] as const;

export default async function FacturesPage({ searchParams }: { searchParams: { status?: string } }) {
  const { org } = await requireActiveOrg();
  const activeTab = searchParams.status === "PAYEE" || searchParams.status === "EN_ATTENTE" ? searchParams.status : "all";

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id, ...(activeTab !== "all" ? { status: activeTab } : {}) },
    include: { trip: true, client: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0" }}>
        <h1 style={{ fontSize: 20 }}>Factures</h1>
        <Link href="/dashboard" style={{ fontSize: 13 }}>Tableau de bord</Link>
      </div>

      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/factures" : `/factures?status=${t.key}`}
            style={{
              textDecoration: "none", padding: "8px 0", fontWeight: 600, fontSize: 14,
              color: activeTab === t.key ? "var(--primary)" : "var(--muted)",
              borderBottom: activeTab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <p className="muted">Aucune facture. Générez-en une depuis le détail d'un voyage.</p>
      ) : (
        invoices.map((inv) => (
          <div key={inv.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>#{inv.number}</div>
              <div className="muted">{inv.client?.name || "—"} · {new Date(inv.date).toLocaleDateString("fr-FR")}</div>
              <a href={`/api/invoices/${inv.id}/pdf`} style={{ fontSize: 12, display: "inline-block", marginTop: 6 }}>Télécharger PDF</a>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{fmtDH(Number(inv.trip.prixTransport))}</div>
              <InvoiceStatusToggle id={inv.id} status={inv.status} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
