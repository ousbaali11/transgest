"use client";

import { useState } from "react";

type Truck = {
  id: string; immat: string; marque: string | null; modele: string | null; capacite: string | null;
  assuranceExpiry: string | null; visiteTechniqueExpiry: string | null; vignetteExpiry: string | null;
};
type Driver = { id: string; name: string; phone: string | null; truckId: string | null; accountActive?: boolean };

const emptyTruck = { immat: "", marque: "", modele: "", capacite: "", assuranceExpiry: "", visiteTechniqueExpiry: "", vignetteExpiry: "" };

function docAlert(t: Truck): { label: string; days: number } | null {
  const today = new Date();
  const docs: [string | null, string][] = [
    [t.assuranceExpiry, "Assurance"],
    [t.visiteTechniqueExpiry, "Visite technique"],
    [t.vignetteExpiry, "Vignette"],
  ];
  let worst: { label: string; days: number } | null = null;
  for (const [date, label] of docs) {
    if (!date) continue;
    const days = Math.ceil((new Date(date).getTime() - today.getTime()) / 86400000);
    if (days <= 30 && (!worst || days < worst.days)) worst = { label, days };
  }
  return worst;
}

export default function FlotteManager({ initialTrucks, initialDrivers }: { initialTrucks: Truck[]; initialDrivers: Driver[] }) {
  const [trucks, setTrucks] = useState(initialTrucks);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [newTruck, setNewTruck] = useState(emptyTruck);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", truckId: "" });
  const [busy, setBusy] = useState(false);
  const [driverError, setDriverError] = useState("");
  const [showDocs, setShowDocs] = useState(false);

  async function addTruck() {
    if (!newTruck.immat) return;
    setBusy(true);
    try {
      const payload = {
        ...newTruck,
        assuranceExpiry: newTruck.assuranceExpiry ? new Date(newTruck.assuranceExpiry).toISOString() : null,
        visiteTechniqueExpiry: newTruck.visiteTechniqueExpiry ? new Date(newTruck.visiteTechniqueExpiry).toISOString() : null,
        vignetteExpiry: newTruck.vignetteExpiry ? new Date(newTruck.vignetteExpiry).toISOString() : null,
      };
      const res = await fetch("/api/trucks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const t = await res.json();
      if (res.ok) { setTrucks([t, ...trucks]); setNewTruck(emptyTruck); }
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
    setDriverError("");
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newDriver, truckId: newDriver.truckId || null }),
      });
      const d = await res.json();
      if (res.ok) { setDrivers([{ ...d, accountActive: false }, ...drivers]); setNewDriver({ name: "", phone: "", truckId: "" }); }
      else setDriverError(d.error || "Erreur lors de l'ajout du chauffeur.");
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
        <button type="button" onClick={() => setShowDocs((v) => !v)} className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", marginBottom: 8, padding: 0 }}>
          {showDocs ? "Masquer les échéances documents" : "+ Échéances documents (assurance, visite technique...)"}
        </button>
        {showDocs && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">Assurance</span>
              <input type="date" value={newTruck.assuranceExpiry} onChange={(e) => setNewTruck({ ...newTruck, assuranceExpiry: e.target.value })} />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">Visite technique</span>
              <input type="date" value={newTruck.visiteTechniqueExpiry} onChange={(e) => setNewTruck({ ...newTruck, visiteTechniqueExpiry: e.target.value })} />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">Vignette</span>
              <input type="date" value={newTruck.vignetteExpiry} onChange={(e) => setNewTruck({ ...newTruck, vignetteExpiry: e.target.value })} />
            </label>
          </div>
        )}
        <button className="btn" disabled={busy || !newTruck.immat} onClick={addTruck}>Ajouter le camion</button>
        {trucks.map((t) => {
          const alert = docAlert(t);
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.immat}</div>
                <div className="muted">{t.marque} {t.modele} {t.capacite ? `· ${t.capacite}` : ""}</div>
                {alert && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: alert.days <= 0 ? "#C0392B" : "#B5791C" }}>
                    {alert.label} {alert.days <= 0 ? "expirée" : `expire dans ${alert.days} j`}
                  </div>
                )}
              </div>
              <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => removeTruck(t.id)}>Supprimer</button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <strong>Chauffeurs</strong>
        <p className="muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 10 }}>
          Renseignez le téléphone d&apos;un chauffeur pour qu&apos;il puisse se connecter avec ce numéro et
          saisir lui-même ses voyages et dépenses.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
          <input placeholder="Nom complet" value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} />
          <input placeholder="Téléphone (+212...)" value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} />
          <select value={newDriver.truckId} onChange={(e) => setNewDriver({ ...newDriver, truckId: e.target.value })}>
            <option value="">Camion assigné</option>
            {trucks.map((t) => <option key={t.id} value={t.id}>{t.immat}</option>)}
          </select>
        </div>
        {driverError && <p className="error-text" style={{ marginBottom: 8 }}>{driverError}</p>}
        <button className="btn" disabled={busy || !newDriver.name} onClick={addDriver}>Ajouter le chauffeur</button>
        {drivers.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div className="muted">{trucks.find((t) => t.id === d.truckId)?.immat || "—"} {d.phone ? `· ${d.phone}` : ""}</div>
              {d.phone && (
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: d.accountActive ? "#2E7D53" : "#B5791C" }}>
                  {d.accountActive ? "Compte activé" : "Pas encore connecté"}
                </div>
              )}
            </div>
            <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => removeDriver(d.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </>
  );
}
