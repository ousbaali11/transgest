import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError } from "@/lib/guards";

/**
 * Génère un jeu de données d'exemple pour découvrir l'application sans
 * avoir à tout saisir à la main — reprend l'idée du prototype ("Charger
 * un exemple"). Toujours additif : n'efface jamais de données existantes.
 */
export async function POST() {
  try {
    const session = await requireOwnerSession();
    const organizationId = session.organizationId;

    const truck = await prisma.truck.create({
      data: { organizationId, immat: "12345-A-6", marque: "Mercedes", modele: "Actros", capacite: "40T" },
    });

    const driver = await prisma.driver.create({
      data: { organizationId, name: "Hassan Amrani", truckId: truck.id },
    });

    const [clientAlWafa, clientTransMaroc, clientAtlas] = await Promise.all([
      prisma.client.create({ data: { organizationId, name: "Société Al Wafa", type: "Professionnel", phone: "0612345678", email: "contact@alwafa.ma", address: "Route de Rabat, Fès" } }),
      prisma.client.create({ data: { organizationId, name: "TransMaroc SARL", type: "Professionnel" } }),
      prisma.client.create({ data: { organizationId, name: "Atlas Logistique", type: "Professionnel" } }),
    ]);

    const today = new Date();
    const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000);

    const tripsData = [
      { depart: "Fès", arrivee: "Casablanca", prixTransport: 5000, avance: 2000, kmDepart: 125400, kmArrivee: 125850, marchandise: "Produits agricoles", quantite: 12, unite: "Tonnes", clientId: clientAlWafa.id, date: daysAgo(2), fuel: 1950, peage: 300, autres: 250 },
      { depart: "Marrakech", arrivee: "Agadir", prixTransport: 4200, avance: 4200, kmDepart: 88000, kmArrivee: 88260, marchandise: "Matériaux de construction", quantite: 18, unite: "Tonnes", clientId: clientTransMaroc.id, date: daysAgo(12), fuel: 1400, peage: 180, autres: 0 },
      { depart: "Fès", arrivee: "Tanger", prixTransport: 6000, avance: 6000, kmDepart: 63000, kmArrivee: 63310, marchandise: "Équipements industriels", quantite: 9, unite: "Tonnes", clientId: clientAlWafa.id, date: daysAgo(28), fuel: 1750, peage: 220, autres: 100 },
      { depart: "Rabat", arrivee: "Marrakech", prixTransport: 3800, avance: 0, kmDepart: 42000, kmArrivee: 42245, marchandise: "Textile", quantite: 6, unite: "Tonnes", clientId: clientAtlas.id, date: daysAgo(55), fuel: 1200, peage: 150, autres: 0 },
      { depart: "Casablanca", arrivee: "Oujda", prixTransport: 4500, avance: 4500, kmDepart: 15000, kmArrivee: 15520, marchandise: "Produits agricoles", quantite: 14, unite: "Tonnes", clientId: clientTransMaroc.id, date: daysAgo(80), fuel: 1900, peage: 260, autres: 80 },
    ];

    for (const t of tripsData) {
      const trip = await prisma.trip.create({
        data: {
          organizationId,
          truckId: truck.id,
          driverId: driver.id,
          clientId: t.clientId,
          date: t.date,
          depart: t.depart,
          arrivee: t.arrivee,
          kmDepart: t.kmDepart,
          kmArrivee: t.kmArrivee,
          marchandise: t.marchandise,
          quantite: t.quantite,
          unite: t.unite,
          prixTransport: t.prixTransport,
          avance: t.avance,
        },
      });

      await prisma.expense.create({
        data: { organizationId, tripId: trip.id, truckId: truck.id, driverId: driver.id, category: "CARBURANT", date: t.date, quantite: Math.round(t.fuel / 13), unite: "L", prixUnitaire: 13, montant: t.fuel },
      });
      if (t.peage > 0) {
        await prisma.expense.create({ data: { organizationId, tripId: trip.id, truckId: truck.id, driverId: driver.id, category: "PEAGE", date: t.date, montant: t.peage } });
      }
      if (t.autres > 0) {
        await prisma.expense.create({ data: { organizationId, tripId: trip.id, truckId: truck.id, driverId: driver.id, category: "AUTRES", date: t.date, montant: t.autres, notes: "Entretien véhicule" } });
      }

      // Facture pour les deux voyages les plus récents, l'une payée, l'autre en attente.
      if (t === tripsData[0] || t === tripsData[1]) {
        const count = await prisma.invoice.count({ where: { organizationId } });
        await prisma.invoice.create({
          data: {
            organizationId,
            tripId: trip.id,
            clientId: t.clientId,
            number: `${today.getFullYear()}-${String(count + 1).padStart(4, "0")}`,
            date: t.date,
            status: t === tripsData[0] ? "PAYEE" : "EN_ATTENTE",
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
