import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import InvoiceStatusToggle from "./InvoiceStatusToggle";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

function fmtDH(n: number) {
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

const TABS = [
  { key: "all", labelKey: "invoices_all" },
  { key: "PAYEE", labelKey: "invoices_paid" },
  { key: "EN_ATTENTE", labelKey: "invoices_pending" },
] as const;

export default async function FacturesPage({ searchParams }: { searchParams: { status?: string } }) {
  const { org } = await requireActiveOrg();
  const locale = getLocale();
  const activeTab = searchParams.status === "PAYEE" || searchParams.status === "EN_ATTENTE" ? searchParams.status : "all";

  const [invoices, allInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: org.id, ...(activeTab !== "all" ? { status: activeTab } : {}) },
      include: { trip: true, client: true },
      orderBy: { date: "desc" },
    }),
    prisma.invoice.findMany({ where: { organizationId: org.id }, select: { status: true } }),
  ]);

  const counts = {
    all: allInvoices.length,
    PAYEE: allInvoices.filter((i) => i.status === "PAYEE").length,
    EN_ATTENTE: allInvoices.filter((i) => i.status === "EN_ATTENTE").length,
  };

  const emptyMessage =
    activeTab === "PAYEE" ? t(locale, "invoices_empty_paid") :
    activeTab === "EN_ATTENTE" ? t(locale, "invoices_empty_pending") :
    t(locale, "invoices_empty_all");

  return (
    <div className="container">
      <ScreenHeader title={t(locale, "nav_invoices")} />

      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/factures" : `/factures?status=${tab.key}`}
            style={{
              textDecoration: "none", padding: "8px 0", fontWeight: 600, fontSize: 14,
              color: activeTab === tab.key ? "var(--primary)" : "var(--muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            {t(locale, tab.labelKey)} <span style={{ opacity: 0.7 }}>({counts[tab.key]})</span>
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        invoices.map((inv) => (
          <div key={inv.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>#{inv.number}</div>
              <div className="muted">{inv.client?.name || "—"} · {new Date(inv.date).toLocaleDateString("fr-FR")}</div>
              <a href={`/api/invoices/${inv.id}/pdf`} style={{ fontSize: 12, display: "inline-block", marginTop: 6 }}>{t(locale, "download_pdf")}</a>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{fmtDH(Number(inv.trip.prixTransport))}</div>
              <InvoiceStatusToggle id={inv.id} status={inv.status} locale={locale} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
