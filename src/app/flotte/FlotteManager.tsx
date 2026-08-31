"use client";

import { useState } from "react";

type Truck = { id: string; immat: string; marque: string | null; modele: string | null; capacite: string | null };
type Driver = { id: string; name: string; phone: string | null; truckId: string | null };

export default function FlotteManager({ initialTrucks, initialDrivers }: { initialTrucks: Truck[]; initialDrivers: Driver[] }) {
  const [trucks, setTrucks] = useState(initialTrucks);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [newTruck, setNewTruck] = useState({ immat: "", marque: "", modele: "", capacite: "" });
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", truckId: "" });
  const [busy, setBusy] = useState(false);

  async function addTruck() {
    if (!newTruck.immat) return;
    setBusy(true);
    try {
      const res = await fetch("/api/trucks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTruck) });
      const t = await res.json();
      if (res.ok) { setTrucks([t, ...trucks]); setNewTruck({ immat: "", marque: "", modele: "", capacite: "" }); }
    } finally {
      setBusy(false);
    }
  }

  async function removeTruck(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/trucks/${id}`, { method: "DELETE" });
      setTrucks(trucks.filter((t) => t.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function addDriver() {
    if (!newDriver.name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newDriver, truckId: newDriver.truckId || null }),
      });
      const d = await res.json();
      if (res.ok) { setDrivers([d, ...drivers]); setNewDriver({ name: "", phone: "", truckId: "" }); }
    } finally {
      setBusy(false);
    }
  }

  async function removeDriver(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/drivers/${id}`, { method: "DELETE" });
      setDrivers(drivers.filter((d) => d.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <strong>Camions</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
          <input placeholder="Immatriculation" value={newTruck.immat} onChange={(e) => setNewTruck({ ...newTruck, immat: e.target.value })} />
          <input placeholder="Marque" value={newTruck.marque} onChange={(e) => setNewTruck({ ...newTruck, marque: e.target.value })} />
          <input placeholder="Modèle" value={newTruck.modele} onChange={(e) => setNewTruck({ ...newTruck, modele: e.target.value })} />
          <input placeholder="Capacité" value={newTruck.capacite} onChange={(e) => setNewTruck({ ...newTruck, capacite: e.target.value })} />
        </div>
        <button className="btn" disabled={busy || !newTruck.immat} onClick={addTruck}>Ajouter le camion</button>
        {trucks.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.immat}</div>
              <div className="muted">{t.marque} {t.modele} {t.capacite ? `· ${t.capacite}` : ""}</div>
            </div>
            <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => removeTruck(t.id)}>Supprimer</button>
          </div>
        ))}
      </div>

      <div className="card">
        <strong>Chauffeurs</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
          <input placeholder="Nom complet" value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} />
          <input placeholder="Téléphone" value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} />
          <select value={newDriver.truckId} onChange={(e) => setNewDriver({ ...newDriver, truckId: e.target.value })}>
            <option value="">Camion assigné</option>
            {trucks.map((t) => <option key={t.id} value={t.id}>{t.immat}</option>)}
          </select>
        </div>
        <button className="btn" disabled={busy || !newDriver.name} onClick={addDriver}>Ajouter le chauffeur</button>
        {drivers.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div className="muted">{trucks.find((t) => t.id === d.truckId)?.immat || "—"} {d.phone ? `· ${d.phone}` : ""}</div>
            </div>
            <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => removeDriver(d.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </>
  );
}
