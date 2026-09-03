"use client";

import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

type Client = { id: string; name: string; phone: string | null; email: string | null; address: string | null };

export default function ClientsManager({ initialClients, locale }: { initialClients: Client[]; locale: Locale }) {
  const [clients, setClients] = useState(initialClients);
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!f.name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const c = await res.json();
      if (res.ok) { setClients([c, ...clients]); setF({ name: "", phone: "", email: "", address: "" }); }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      setClients(clients.filter((c) => c.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <strong>{t(locale, "clients_new")}</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
        <input placeholder={t(locale, "field_name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input placeholder={t(locale, "field_phone")} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input placeholder={t(locale, "field_email")} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input placeholder={t(locale, "field_address")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </div>
      <button className="btn" disabled={busy || !f.name} onClick={add}>{t(locale, "add_client")}</button>

      {clients.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 10 }}>
          <div>
            <Link href={`/clients/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
            </Link>
            <div className="muted">{[c.phone, c.email, c.address].filter(Boolean).join(" · ")}</div>
          </div>
          <button className="btn btn-danger" style={{ width: "auto", padding: "4px 10px" }} onClick={() => remove(c.id)}>{t(locale, "delete")}</button>
        </div>
      ))}
    </div>
  );
}
