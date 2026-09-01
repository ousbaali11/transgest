import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/require-active-org";
import ClientTabs from "./ClientTabs";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { org } = await requireActiveOrg();

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client || client.organizationId !== org.id) notFound();

  const [trips, invoices] = await Promise.all([
    prisma.trip.findMany({
      where: { organizationId: org.id, clientId: client.id },
      include: { expenses: true },
      orderBy: { date: "desc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: org.id, clientId: client.id },
      include: { trip: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const tripsPlain = trips.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    depart: t.depart,
    arrivee: t.arrivee,
    prixTransport: Number(t.prixTransport),
    benefice: Number(t.prixTransport) - t.expenses.reduce((s, e) => s + Number(e.montant), 0),
  }));
  const invoicesPlain = invoices.map((i) => ({
    id: i.id,
    number: i.number,
    date: i.date.toISOString(),
    status: i.status,
    montant: Number(i.trip.prixTransport),
  }));

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
        <Link href="/clients" style={{ color: "var(--text)" }}>←</Link>
        <h1 style={{ fontSize: 20 }}>Client</h1>
      </div>

      <div className="card">
        <strong style={{ fontSize: 16 }}>{client.name}</strong>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{client.type}</div>
        {client.phone && <div style={{ padding: "4px 0", fontSize: 14 }}><span className="muted">Téléphone </span>{client.phone}</div>}
        {client.email && <div style={{ padding: "4px 0", fontSize: 14 }}><span className="muted">Email </span>{client.email}</div>}
        {client.address && <div style={{ padding: "4px 0", fontSize: 14 }}><span className="muted">Adresse </span>{client.address}</div>}
        {client.notes && <div style={{ padding: "4px 0", fontSize: 14 }}><span className="muted">Notes </span>{client.notes}</div>}
      </div>

      <ClientTabs trips={tripsPlain} invoices={invoicesPlain} />

      <Link href="/trips" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
        Nouveau voyage
      </Link>
    </div>
  );
}
