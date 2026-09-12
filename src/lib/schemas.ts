import { z } from "zod";

/**
 * Schémas Zod partagés entre une route de création (POST) et sa route de
 * modification ([id]/PATCH, via .partial()). Ils vivent ici et non dans les
 * fichiers route.ts : Next.js n'accepte dans un fichier de route que les
 * exports qu'il connaît (GET, POST, config...) — tout autre export fait
 * échouer la vérification de types de `next build`.
 */

// Valeurs des colonnes personnalisées : texte ou nombre uniquement, jamais
// un objet/tableau arbitraire stocké tel quel dans la colonne JSON.
export const customFieldsSchema = z.record(z.union([z.string().max(500), z.number()]));

export const tripSchema = z.object({
  truckId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  date: z.string().datetime(),
  depart: z.string().min(1),
  arrivee: z.string().min(1),
  // Kilométrage total du trajet, saisi directement (plus de relevés
  // compteur départ/arrivée).
  distanceKm: z.number().int().nonnegative().optional().nullable(),
  marchandise: z.string().optional(),
  quantite: z.number().optional().nullable(),
  unite: z.string().optional().nullable(),
  prixTransport: z.number().default(0),
  avance: z.number().default(0),
  notes: z.string().optional(),
  customFields: customFieldsSchema.optional(),
});

export const expenseSchema = z.object({
  tripId: z.string().optional().nullable(),
  truckId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  category: z.enum(["CARBURANT", "PEAGE", "AUTRES"]),
  date: z.string().datetime(),
  // Somme totale payée, pour toutes les catégories (le carburant n'a plus
  // de litres × prix au litre).
  montant: z.number().nonnegative(),
  notes: z.string().optional(),
  customFields: customFieldsSchema.optional(),
});

export const clientSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("Professionnel"),
  phone: z.string().optional(),
  // Le formulaire envoie "" quand le champ est vide : accepté (aucun email),
  // sinon l'adresse doit être valide.
  email: z.union([z.literal(""), z.string().email()]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const truckSchema = z.object({
  immat: z.string().min(1),
  marque: z.string().optional(),
  modele: z.string().optional(),
  capacite: z.string().optional(),
  assuranceExpiry: z.string().datetime().optional().nullable(),
  visiteTechniqueExpiry: z.string().datetime().optional().nullable(),
  vignetteExpiry: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});
