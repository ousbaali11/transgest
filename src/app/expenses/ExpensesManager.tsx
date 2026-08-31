"use client";

import { useState } from "react";

type Expense = { id: string; category: string; date: string; montant: number; quantite: number | null; unite: string | null; notes: string | null; truckId: string | null };
type Option = { id: string; name?: string; immat?: string };
type Trip = { id: string; date: string; depart: string; arrivee: string };

function fmtDH(n: number) {
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default function ExpensesManager({ initialExpenses, trucks, drivers, trips }: { initialExpenses: Expense[]; trucks: Option[]; drivers: Option[]; trips: Trip[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [category, setCategory] = useState<"CARBURANT" | "PEAGE" | "AUTRES">("CARBURANT");
  const [f, setF] = useState({ tripId: "", truckId: trucks[0]?.id || "", driverId: "", quantite: "", prixUnitaire: "", montant: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const auto = category === "CARBURANT" && f.quantite && f.prixUnitaire ? Number(f.quantite) * Number(f.prixUnitaire) : null;

  async function add() {
    setBusy(true);
    try {
      const montant = category === "CARBURANT" ? (auto ?? Number(f.montant) ?? 0) : Number(f.montant) || 0;
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category, date: new Date().toISOString(),
          tripId: f.tripId || null, truckId: f.truckId || null, driverId: f.driverId || null,
          quantite: f.quantite ? Number(f.quantite) : null,
          unite: category === "CARBURANT" ? "L" : null,
          prixUnitaire: f.prixUnitaire ? Number(f.prixUnitaire) : null,
          montant, notes: f.notes,
        }),
      });
      const e = await res.json();
      if (res.ok) { setExpenses([e, ...expenses]); setF({ ...f, quantite: "", prixUnitaire: "", montant: "", notes: "" }); }
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
    }
  }

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 12 }}>
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
          <select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })}>
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
        <button className="btn" disabled={busy} onClick={add}>Enregistrer</button>
      </div>

      {expenses.map((e) => (
        <div key={e.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{e.category}</div>
            <div className="muted">{new Date(e.date).toLocaleDateString("fr-FR")}{e.quantite ? ` · ${e.quantite} ${e.unite}` : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong>{fmtDH(e.montant)}</strong>
            <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => remove(e.id)}>×</button>
          </div>
        </div>
      ))}
    </>
  );
}
