import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ScreenHeader from "@/components/ScreenHeader";
import LogoutButton from "../../LogoutButton";
import SubscriptionActions from "./SubscriptionActions";
import { Truck, Users, Package, ChevronRight } from "lucide-react";
import Link from "next/link";

function fmtDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR");
}

export default async function ReglagesPage() {
  const { org, session } = await requireActiveOrg();
  const isOwner = session.role === "OWNER";
  const plan = org.planId ? await prisma.plan.findUnique({ where: { id: org.planId } }) : null;

  return (
    <div className="container">
      <ScreenHeader title="Réglages" backHref="/dashboard" />

      {isOwner ? (
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
      ) : (
        <div className="card">
          <strong>Compte chauffeur</strong>
          <p className="muted" style={{ marginTop: 8 }}>
            Vous pouvez saisir vos voyages et vos dépenses. La gestion de la flotte, des clients et de
            l&apos;abonnement est réservée au propriétaire.
          </p>
        </div>
      )}

      {isOwner && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {[
            { href: "/flotte", label: "Camions & chauffeurs", icon: Truck },
            { href: "/clients", label: "Clients", icon: Users },
            { href: "/colonnes", label: "Colonnes personnalisées", icon: Package },
          ].map((it) => (
            <Link
              key={it.href}
              href={it.href}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, textDecoration: "none", color: "var(--text)" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500 }}>
                <it.icon size={16} color="var(--primary)" /> {it.label}
              </span>
              <ChevronRight size={16} color="#9CA3AF" />
            </Link>
          ))}
        </div>
      )}

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Compte</strong>
          <div className="muted">{session.phone} {!isOwner && "· Chauffeur"}</div>
        </div>
        <LogoutButton redirectTo="/login" />
      </div>
    </div>
  );
}
