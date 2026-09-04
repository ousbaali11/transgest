"use client";

import { useState } from "react";
import Link from "next/link";
import { t as tr, dateLocale, type Locale } from "@/lib/i18n";

type Trip = { id: string; date: string; depart: string; arrivee: string; prixTransport: number; benefice: number };
type Invoice = { id: string; number: string; date: string; status: string; montant: number };

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default function ClientTabs({ trips, invoices, locale }: { trips: Trip[]; invoices: Invoice[]; locale: Locale }) {
  const [tab, setTab] = useState<"voyages" | "factures">("voyages");

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
        <button
          onClick={() => setTab("voyages")}
          style={{ background: "none", border: "none", padding: "8px 0", fontWeight: 600, cursor: "pointer", color: tab === "voyages" ? "var(--primary)" : "var(--muted)", borderBottom: tab === "voyages" ? "2px solid var(--primary)" : "2px solid transparent" }}
        >
          {tr(locale, "client_trips_tab")}
        </button>
        <button
          onClick={() => setTab("factures")}
          style={{ background: "none", border: "none", padding: "8px 0", fontWeight: 600, cursor: "pointer", color: tab === "factures" ? "var(--primary)" : "var(--muted)", borderBottom: tab === "factures" ? "2px solid var(--primary)" : "2px solid transparent" }}
        >
          {tr(locale, "client_invoices_tab")}
        </button>
      </div>

      {tab === "voyages" ? (
        trips.length === 0 ? (
          <p className="muted">{tr(locale, "client_no_trips")}</p>
        ) : (
          trips.map((t) => (
            <Link key={t.id} href={`/trips/${t.id}`} style={{ display: "block", textDecoration: "none", color: "var(--text)", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t.depart} → {t.arrivee}</span>
                <strong>{fmtDH(t.prixTransport)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(t.date).toLocaleDateString(dateLocale(locale))}</span>
                <span style={{ fontSize: 12, color: t.benefice >= 0 ? "#2E7D53" : "#C0392B" }}>{tr(locale, "profit_label")}{fmtDH(t.benefice)}</span>
              </div>
            </Link>
          ))
        )
      ) : invoices.length === 0 ? (
        <p className="muted">{tr(locale, "client_no_invoices")}</p>
      ) : (
        invoices.map((inv) => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div>
              <div>#{inv.number}</div>
              <div className="muted" style={{ fontSize: 12 }}>{new Date(inv.date).toLocaleDateString(dateLocale(locale))}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong>{fmtDH(inv.montant)}</strong>
              <div>
                <a href={`/api/invoices/${inv.id}/pdf`} style={{ fontSize: 12 }}>PDF</a>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
