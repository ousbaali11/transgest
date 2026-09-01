import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import LogoutButton from "../LogoutButton";
import SubscriptionActions from "./SubscriptionActions";

function fmtDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR");
}

export default async function ReglagesPage() {
  const { org, session } = await requireActiveOrg();
  const plan = org.planId ? await prisma.plan.findUnique({ where: { id: org.planId } }) : null;

  return (
    <div className="container">
      <h1 style={{ fontSize: 20, margin: "20px 0" }}>Réglages</h1>

      <div className="card">
        <strong>Mon abonnement</strong>
        <div style={{ background: "var(--primary-10)", borderRadius: 8, padding: 12, margin: "10px 0" }}>
          <div style={{ fontWeight: 700, color: "var(--primary)" }}>{plan?.label || "—"}</div>
          <div style={{ fontSize: 13 }}>
            {org.grantedByAdmin
              ? `Offert par l'administrateur${org.currentPeriodEnd ? ` — jusqu'au ${fmtDate(org.currentPeriodEnd)}` : " — accès illimité"}`
              : org.cancelAtPeriodEnd
              ? `Résilié — accès jusqu'au ${fmtDate(org.currentPeriodEnd)}`
              : `Renouvellement le ${fmtDate(org.currentPeriodEnd)}`}
          </div>
        </div>
        {org.grantedByAdmin ? (
          <p className="muted">Cet abonnement vous a été offert par l'administrateur — il ne peut pas être résilié depuis l'application.</p>
        ) : (
          <SubscriptionActions cancelAtPeriodEnd={org.cancelAtPeriodEnd} />
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        <Link href="/flotte" className="card" style={{ display: "block", textDecoration: "none", color: "var(--text)" }}>Camions & chauffeurs</Link>
        <Link href="/clients" className="card" style={{ display: "block", textDecoration: "none", color: "var(--text)" }}>Clients</Link>
        <Link href="/colonnes" className="card" style={{ display: "block", textDecoration: "none", color: "var(--text)" }}>Colonnes personnalisées</Link>
        <a href="/api/export" className="card" style={{ display: "block", textDecoration: "none", color: "var(--text)" }}>Exporter en Excel</a>
      </div>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Compte</strong>
          <div className="muted">{session.phone}</div>
        </div>
        <LogoutButton redirectTo="/login" />
      </div>
    </div>
  );
}
