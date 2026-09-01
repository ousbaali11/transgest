"use client";

import { useState } from "react";

type Expense = {
  id: string; category: "CARBURANT" | "PEAGE" | "AUTRES"; date: string; montant: number;
  quantite: number | null; unite: string | null; prixUnitaire: number | null; notes: string | null;
  truckId: string | null; driverId: string | null; tripId: string | null; customFields: Record<string, string> | null;
};
type Option = { id: string; name?: string; immat?: string };
type Trip = { id: string; date: string; depart: string; arrivee: string };
type CustomFieldDef = { id: string; label: string; type: "TEXT" | "NUMBER" };

function fmtDH(n: number) {
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

const emptyForm = (trucks: Option[], lockedDriverId: string | null) => ({ tripId: "", truckId: trucks[0]?.id || "", driverId: lockedDriverId || "", quantite: "", prixUnitaire: "", montant: "", notes: "" });

export default function ExpensesManager({ initialExpenses, trucks, drivers, trips, customFields = [], currentDriverId = null }: { initialExpenses: Expense[]; trucks: Option[]; drivers: Option[]; trips: Trip[]; customFields?: CustomFieldDef[]; currentDriverId?: string | null }) {
  const isDriverViewer = currentDriverId !== null;
  const [expenses, setExpenses] = useState(initialExpenses);
  const [category, setCategory] = useState<"CARBURANT" | "PEAGE" | "AUTRES">("CARBURANT");
  const [f, setF] = useState(emptyForm(trucks, currentDriverId));
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const auto = category === "CARBURANT" && f.quantite && f.prixUnitaire ? Number(f.quantite) * Number(f.prixUnitaire) : null;

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setCategory(e.category);
    setF({
      tripId: e.tripId || "", truckId: e.truckId || trucks[0]?.id || "", driverId: e.driverId || "",
      quantite: e.quantite?.toString() || "", prixUnitaire: e.prixUnitaire?.toString() || "",
      montant: e.montant.toString(), notes: e.notes || "",
    });
    setCustom(e.customFields || {});
  }

  function cancelEdit() {
    setEditingId(null);
    setF(emptyForm(trucks, currentDriverId));
    setCustom({});
  }

  async function save() {
    setBusy(true);
    try {
      const montant = category === "CARBURANT" ? (auto ?? Number(f.montant) ?? 0) : Number(f.montant) || 0;
      const payload = {
        category, date: new Date().toISOString(),
        tripId: f.tripId || null, truckId: f.truckId || null, driverId: f.driverId || null,
        quantite: f.quantite ? Number(f.quantite) : null,
        unite: category === "CARBURANT" ? "L" : null,
        prixUnitaire: f.prixUnitaire ? Number(f.prixUnitaire) : null,
        montant, notes: f.notes, customFields: custom,
      };

      if (editingId) {
        const res = await fetch(`/api/expenses/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const updated = await res.json();
        if (res.ok) setExpenses(expenses.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const created = await res.json();
        if (res.ok) setExpenses([created, ...expenses]);
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      setExpenses(expenses.filter((e) => e.id !== id));
    } finally {
      setBusy(false);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <>
      <div className="card">
        <strong>{editingId ? "Modifier la dépense" : "Nouvelle dépense"}</strong>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", marginTop: 10, marginBottom: 12 }}>
          {(["CARBURANT", "PEAGE", "AUTRES"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{ flex: 1, padding: 8, border: "none", cursor: "pointer", background: category === c ? "var(--primary)" : "#fff", color: category === c ? "#fff" : "var(--text)" }}
            >
              {c === "CARBURANT" ? "Carburant" : c === "PEAGE" ? "Péage" : "Autres"}
            </button>
          ))}
        </div>

        <select value={f.tripId} onChange={(e) => setF({ ...f, tripId: e.target.value })} style={{ marginBottom: 8 }}>
          <option value="">Voyage lié (optionnel)</option>
          {trips.map((t) => <option key={t.id} value={t.id}>{new Date(t.date).toLocaleDateString("fr-FR")} · {t.depart} → {t.arrivee}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <select value={f.truckId} onChange={(e) => setF({ ...f, truckId: e.target.value })}>
            {trucks.map((t) => <option key={t.id} value={t.id}>{t.immat}</option>)}
          </select>
          <select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })} disabled={isDriverViewer}>
            <option value="">Chauffeur</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {category === "CARBURANT" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input type="number" placeholder="Quantité (L)" value={f.quantite} onChange={(e) => setF({ ...f, quantite: e.target.value })} />
            <input type="number" placeholder="Prix unitaire (DH/L)" value={f.prixUnitaire} onChange={(e) => setF({ ...f, prixUnitaire: e.target.value })} />
          </div>
        ) : (
          <input type="number" placeholder="Montant (DH)" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} style={{ marginBottom: 8 }} />
        )}
        {auto !== null && <p className="muted" style={{ marginBottom: 8 }}>Dépense totale : {fmtDH(auto)}</p>}
        <input placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} style={{ marginBottom: 8 }} />

        {customFields.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {customFields.map((cf) => (
              <input key={cf.id} type={cf.type === "NUMBER" ? "number" : "text"} placeholder={cf.label} value={custom[cf.id] || ""} onChange={(e) => setCustom({ ...custom, [cf.id]: e.target.value })} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {editingId && <button className="btn btn-ghost" onClick={cancelEdit}>Annuler</button>}
          <button className="btn" disabled={busy} onClick={save}>{busy ? "…" : editingId ? "Enregistrer les modifications" : "Enregistrer"}</button>
        </div>
      </div>

      {expenses.map((e) => {
        const canEdit = !isDriverViewer || e.driverId === currentDriverId;
        return (
          <div key={e.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{e.category}</div>
                <div className="muted">{new Date(e.date).toLocaleDateString("fr-FR")}{e.quantite ? ` · ${e.quantite} ${e.unite}` : ""}</div>
              </div>
              <strong>{fmtDH(e.montant)}</strong>
            </div>
            {canEdit && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                <button className="btn" style={{ width: "auto", padding: "4px 10px", fontSize: 12, background: "#F1F1EF", color: "var(--text)" }} onClick={() => startEdit(e)}>Modifier</button>
                {confirmingDeleteId === e.id ? (
                  <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }} disabled={busy} onClick={() => remove(e.id)}>Confirmer ?</button>
                ) : (
                  <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }} onClick={() => setConfirmingDeleteId(e.id)}>Supprimer</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
