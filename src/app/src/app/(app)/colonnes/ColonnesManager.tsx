"use client";

import { useState } from "react";

type Field = { id: string; target: "TRIP" | "EXPENSE"; label: string; type: "TEXT" | "NUMBER" };

export default function ColonnesManager({ initialFields }: { initialFields: Field[] }) {
  const [fields, setFields] = useState(initialFields);
  const [target, setTarget] = useState<"TRIP" | "EXPENSE">("TRIP");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"TEXT" | "NUMBER">("TEXT");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, label, type }),
      });
      const f = await res.json();
      if (res.ok) { setFields([f, ...fields]); setLabel(""); }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/custom-fields?id=${id}`, { method: "DELETE" });
      setFields(fields.filter((f) => f.id !== id));
    } finally {
      setBusy(false);
    }
  }

  const tripFields = fields.filter((f) => f.target === "TRIP");
  const expenseFields = fields.filter((f) => f.target === "EXPENSE");

  return (
    <>
      <div className="card">
        <strong>Ajouter une colonne</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
          <select value={target} onChange={(e) => setTarget(e.target.value as "TRIP" | "EXPENSE")}>
            <option value="TRIP">Voyages</option>
            <option value="EXPENSE">Dépenses</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as "TEXT" | "NUMBER")}>
            <option value="TEXT">Texte</option>
            <option value="NUMBER">Nombre</option>
          </select>
        </div>
        <input placeholder="Nom de la colonne (ex: N° de plomb)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ marginBottom: 8 }} />
        <button className="btn" disabled={busy || !label.trim()} onClick={add}>Ajouter la colonne</button>
      </div>

      <div className="card">
        <strong>Colonnes des voyages</strong>
        {tripFields.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>Aucune colonne personnalisée.</p>
        ) : (
          tripFields.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 8 }}>
              <div>{f.label} <span className="muted">({f.type === "NUMBER" ? "Nombre" : "Texte"})</span></div>
              <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => remove(f.id)}>Supprimer</button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <strong>Colonnes des dépenses</strong>
        {expenseFields.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>Aucune colonne personnalisée.</p>
        ) : (
          expenseFields.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 8 }}>
              <div>{f.label} <span className="muted">({f.type === "NUMBER" ? "Nombre" : "Texte"})</span></div>
              <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => remove(f.id)}>Supprimer</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
