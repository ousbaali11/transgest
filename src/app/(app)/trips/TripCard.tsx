"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t as tr, dateLocale, type Locale } from "@/lib/i18n";

type Option = { id: string; name?: string; immat?: string };
type CustomFieldDef = { id: string; label: string; type: "TEXT" | "NUMBER" };
type Trip = {
  id: string; date: string; depart: string; arrivee: string; marchandise: string | null;
  truckId: string; driverId: string | null; clientId: string | null;
  kmDepart: number | null; kmArrivee: number | null; createdByUserId: string | null;
  prixTransport: number; avance: number; customFields: Record<string, string> | null;
};

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default function TripCard({
  trip, benefice, truckLabel, driverLabel, clientLabel, invoice,
  trucks, drivers, clients, customFields = [], currentDriverId = null, currentUserId = null, locale,
}: {
  trip: Trip; benefice: number; truckLabel: string; driverLabel: string; clientLabel: string;
  invoice: { id: string; number: string; status: string } | null;
  trucks: Option[]; drivers: Option[]; clients: Option[]; customFields?: CustomFieldDef[]; currentDriverId?: string | null; currentUserId?: string | null; locale: Locale;
}) {
  const router = useRouter();
  const isDriverViewer = currentDriverId !== null;
  // Un chauffeur ne peut modifier que ce qu'il a lui-même saisi — pas ce que
  // le propriétaire a entré, même si le voyage lui est attribué.
  const canEdit = !isDriverViewer || trip.createdByUserId === currentUserId;
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    truckId: trip.truckId, driverId: trip.driverId || "", clientId: trip.clientId || "",
    depart: trip.depart, arrivee: trip.arrivee,
    kmDepart: trip.kmDepart?.toString() || "", kmArrivee: trip.kmArrivee?.toString() || "",
    prixTransport: trip.prixTransport.toString(), avance: trip.avance.toString(), marchandise: trip.marchandise || "",
  });
  const [custom, setCustom] = useState<Record<string, string>>(trip.customFields || {});
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckId: f.truckId, driverId: f.driverId || null, clientId: f.clientId || null,
          depart: f.depart, arrivee: f.arrivee,
          kmDepart: f.kmDepart ? Number(f.kmDepart) : null, kmArrivee: f.kmArrivee ? Number(f.kmArrivee) : null,
          marchandise: f.marchandise, prixTransport: Number(f.prixTransport) || 0, avance: Number(f.avance) || 0,
          customFields: custom,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setEditing(false); router.refresh(); }
      else setError(data.error || "Impossible d'enregistrer les modifications.");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  async function generateInvoice() {
    setBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="card">
        <strong>{tr(locale, "trips_edit")}</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <select value={f.truckId} onChange={(e) => setF({ ...f, truckId: e.target.value })}>
            {trucks.map((t) => <option key={t.id} value={t.id}>{t.immat}</option>)}
          </select>
          <select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })} disabled={isDriverViewer}>
            <option value="">{tr(locale, "field_driver")}</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input placeholder={tr(locale, "field_departure")} value={f.depart} onChange={(e) => setF({ ...f, depart: e.target.value })} />
          <input placeholder={tr(locale, "field_destination")} value={f.arrivee} onChange={(e) => setF({ ...f, arrivee: e.target.value })} />
          <input type="number" placeholder={tr(locale, "field_km_departure")} value={f.kmDepart} onChange={(e) => setF({ ...f, kmDepart: e.target.value })} />
          <input type="number" placeholder={tr(locale, "field_km_arrival")} value={f.kmArrivee} onChange={(e) => setF({ ...f, kmArrivee: e.target.value })} />
          <select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
            <option value="">{tr(locale, "field_no_client")}</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder={tr(locale, "field_merchandise")} value={f.marchandise} onChange={(e) => setF({ ...f, marchandise: e.target.value })} />
          <input type="number" placeholder={tr(locale, "field_transport_price")} value={f.prixTransport} onChange={(e) => setF({ ...f, prixTransport: e.target.value })} />
          <input type="number" placeholder={tr(locale, "field_advance")} value={f.avance} onChange={(e) => setF({ ...f, avance: e.target.value })} />
        </div>
        {customFields.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {customFields.map((cf) => (
              <input key={cf.id} type={cf.type === "NUMBER" ? "number" : "text"} placeholder={cf.label} value={custom[cf.id] || ""} onChange={(e) => setCustom({ ...custom, [cf.id]: e.target.value })} />
            ))}
          </div>
        )}
        {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => setEditing(false)}>{tr(locale, "cancel")}</button>
          <button className="btn" disabled={busy} onClick={save}>{busy ? "…" : tr(locale, "save")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Link href={`/trips/${trip.id}`} style={{ textDecoration: "none" }}>
          <strong style={{ color: "var(--text)" }}>{trip.depart} → {trip.arrivee}</strong>
        </Link>
        <span className="muted">{new Date(trip.date).toLocaleDateString(dateLocale(locale))}</span>
      </div>
      <div className="muted" style={{ margin: "4px 0" }}>{truckLabel} · {driverLabel} · {clientLabel}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{trip.marchandise || "—"}</span>
        <strong style={{ color: benefice >= 0 ? "#2e7d53" : "#c0392b" }}>{fmtDH(benefice)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        {invoice ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: invoice.status === "PAYEE" ? "#E4F3EA" : "#FDF1DF", color: invoice.status === "PAYEE" ? "#2E7D53" : "#B5791C" }}>
              Facture #{invoice.number} — {invoice.status === "PAYEE" ? tr(locale, "invoice_paid") : tr(locale, "invoice_pending")}
            </span>
            <a href={`/api/invoices/${invoice.id}/pdf`} style={{ fontSize: 11 }}>PDF</a>
          </span>
        ) : (
          <button className="btn btn-ghost" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }} disabled={busy} onClick={generateInvoice}>{tr(locale, "invoice_generate")}</button>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          {canEdit && (
            <>
              <button className="btn" style={{ width: "auto", padding: "4px 10px", fontSize: 12, background: "#F1F1EF", color: "var(--text)" }} onClick={() => setEditing(true)}>{tr(locale, "edit")}</button>
              {confirmingDelete ? (
                <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }} disabled={busy} onClick={remove}>{tr(locale, "confirm")}</button>
              ) : (
                <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }} onClick={() => setConfirmingDelete(true)}>{tr(locale, "delete")}</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
