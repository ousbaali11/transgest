"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * En-tête de page cohérent, repris du prototype d'origine : titre en
 * police d'affichage, flèche de retour optionnelle (pour les écrans
 * atteints depuis le menu "Plus", jamais pour les onglets principaux), et
 * emplacement optionnel pour une action à droite (ex: bouton "+").
 */
export default function ScreenHeader({ title, backHref, right }: { title: string; backHref?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {backHref && (
          <Link href={backHref} aria-label="Retour" style={{ display: "flex", padding: 4, marginLeft: -4 }}>
            <ArrowLeft size={20} color="var(--primary)" />
          </Link>
        )}
        <h1 style={{ fontSize: 20 }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}
