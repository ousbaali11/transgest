"use client";

import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <div className="container" style={{ textAlign: "center", marginTop: 100 }}>
          <span style={{ fontSize: 40 }}>⚠️</span>
          <h1 style={{ fontSize: 22, marginTop: 16, marginBottom: 8 }}>Une erreur est survenue</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            Réessayez dans quelques instants.
          </p>
          <button className="btn" style={{ width: "auto", padding: "10px 24px" }} onClick={() => reset()}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
