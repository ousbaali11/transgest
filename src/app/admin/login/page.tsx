"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      router.push("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, marginTop: 40, marginBottom: 4 }}>Espace administrateur</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Réservé à l'éditeur de l'application.</p>

      <label className="field">
        <span className="field-label">Adresse email</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@transgest.ma" />
      </label>
      <label className="field">
        <span className="field-label">Mot de passe</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
      </label>
      {error && <p className="error-text">{error}</p>}
      <button className="btn" onClick={submit} disabled={busy || !email || !password}>{busy ? "Connexion…" : "Se connecter"}</button>

      <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
        Identifiants créés par <code>prisma/seed.ts</code> — voir le README.
      </p>
    </div>
  );
}
