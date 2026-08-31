import { PrismaClient, ExpenseCategory, InvoiceStatus, CustomFieldTarget, CustomFieldType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Formules d'abonnement -------------------------------------------------
  const free = await prisma.plan.upsert({
    where: { key: "free" },
    update: {},
    create: { key: "free", label: "Gratuit", priceMAD: 0, visible: true, tagline: "Pour découvrir l'application" },
  });
  await prisma.plan.upsert({
    where: { key: "pro" },
    update: {},
    create: { key: "pro", label: "Pro", priceMAD: 299, visible: true, tagline: "Pour les flottes actives, support prioritaire" },
  });

  // --- Réglages de la plateforme ----------------------------------------------
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", appName: "TransGest", logoEmoji: "🚛", themePrimary: "#16305B", themeAccent: "#E8892E" },
  });

  // --- Compte administrateur ---------------------------------------------------
  // ⚠️ Changez ce mot de passe immédiatement après le premier déploiement,
  // depuis Réglages admin > Sécurité, ou en relançant ce script avec une autre
  // valeur pour ADMIN_PASSWORD.
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@transgest.ma").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2026";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { role: "PLATFORM_ADMIN", email: adminEmail, passwordHash },
  });

  // --- Organisation de démonstration (optionnel, désactivez si non souhaité) --
  if (process.env.SEED_DEMO_DATA === "true") {
    const org = await prisma.organization.create({
      data: { name: "Transport Bennani & Fils", planId: free.id, countryCode: "MA" },
    });
    const truck1 = await prisma.truck.create({
      data: { organizationId: org.id, immat: "12345-A-6", marque: "Mercedes", modele: "Actros", capacite: "20T" },
    });
    const driver1 = await prisma.driver.create({
      data: { organizationId: org.id, truckId: truck1.id, name: "Hassan Bennani", phone: "0612345678" },
    });
    const client1 = await prisma.client.create({
      data: { organizationId: org.id, name: "Société Al Wafa", type: "Professionnel", phone: "0612345678", address: "Route de Rabat, Fès" },
    });
    const trip1 = await prisma.trip.create({
      data: {
        organizationId: org.id, truckId: truck1.id, driverId: driver1.id, clientId: client1.id,
        date: new Date(), depart: "Fès", arrivee: "Casablanca",
        kmDepart: 125400, kmArrivee: 125850,
        marchandise: "Produits agricoles", quantite: 12, unite: "Tonnes",
        prixTransport: 5000, avance: 5000,
      },
    });
    await prisma.expense.createMany({
      data: [
        { organizationId: org.id, tripId: trip1.id, truckId: truck1.id, driverId: driver1.id, category: ExpenseCategory.CARBURANT, date: trip1.date, quantite: 150, unite: "L", prixUnitaire: 13, montant: 1950 },
        { organizationId: org.id, tripId: trip1.id, truckId: truck1.id, driverId: driver1.id, category: ExpenseCategory.PEAGE, date: trip1.date, montant: 300 },
      ],
    });
    await prisma.invoice.create({
      data: { organizationId: org.id, tripId: trip1.id, clientId: client1.id, number: "2026-0001", date: trip1.date, status: InvoiceStatus.PAYEE },
    });
    await prisma.customFieldDefinition.create({
      data: { organizationId: org.id, target: CustomFieldTarget.TRIP, label: "N° de plomb", type: CustomFieldType.TEXT },
    });
    console.log("Organisation de démonstration créée.");
  }

  console.log(`Admin prêt : ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
