"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t as tr, type Locale } from "@/lib/i18n";

type Option = { id: string; name?: string; immat?: string };
type CustomFieldDef = { id: string; label: string; type: "TEXT" | "NUMBER" };

export default function NewTripForm({ trucks, drivers, clients, customFields = [], lockedDriverId = null, locale }: { trucks: Option[]; drivers: Option[]; clients: Option[]; customFields?: CustomFieldDef[]; lockedDriverId?: string | null; locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    truckId: trucks[0]?.id || "", driverId: lockedDriverId || "", clientId: "",
    depart: "", arrivee: "", kmDepart: "", kmArrivee: "",
    prixTransport: "", avance: "", marchandise: "",
  });
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckId: f.truckId,
          driverId: f.driverId || null,
          clientId: f.clientId || null,
          date: new Date().toISOString(),
          depart: f.depart,
          arrivee: f.arrivee,
          kmDepart: f.kmDepart ? Number(f.kmDepart) : null,
          kmArrivee: f.kmArrivee ? Number(f.kmArrivee) : null,
          marchandise: f.marchandise,
          prixTransport: Number(f.prixTransport) || 0,
          avance: Number(f.avance) || 0,
          customFields: custom,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOpen(false);
        setF({ truckId: trucks[0]?.id || "", driverId: lockedDriverId || "", clientId: "", depart: "", arrivee: "", kmDepart: "", kmArrivee: "", prixTransport: "", avance: "", marchandise: "" });
        setCustom({});
        router.refresh();
      } else {
        setError(data.error || "Impossible d'enregistrer le voyage.");
      }
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <button className="btn" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>+ {tr(locale, "trips_new")}</button>;
  }

  return (
    <div className="card">
      <strong>{tr(locale, "trips_new")}</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <select value={f.truckId} onChange={(e) => setF({ ...f, truckId: e.target.value })}>
          {trucks.map((t) => <option key={t.id} value={t.id}>{t.immat}</option>)}
        </select>
        <select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })} disabled={!!lockedDriverId}>
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
            <input
              key={cf.id}
              type={cf.type === "NUMBER" ? "number" : "text"}
              placeholder={cf.label}
              value={custom[cf.id] || ""}
              onChange={(e) => setCustom({ ...custom, [cf.id]: e.target.value })}
            />
          ))}
        </div>
      )}
      {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>{tr(locale, "cancel")}</button>
        <button className="btn" disabled={busy || !f.depart || !f.arrivee || !f.truckId} onClick={submit}>
          {busy ? tr(locale, "saving") : tr(locale, "save")}
        </button>
      </div>
    </div>
  );
}
