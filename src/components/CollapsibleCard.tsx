"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Carte pliable/dépliable — remplace un simple <div className="card"> pour
 * réduire l'encombrement visuel du panneau admin, qui accumule beaucoup de
 * sections. Fermée par défaut sauf si `defaultOpen` est passé.
 */
export default function CollapsibleCard({
  title, defaultOpen = false, children,
}: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <strong>{title}</strong>
        <ChevronDown size={18} color="var(--muted)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}
