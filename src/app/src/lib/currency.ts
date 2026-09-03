export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export type Currency = "MAD" | "EUR" | "USD";

export function currencyForCountry(cc: string | null | undefined): Currency {
  if (cc === "MA") return "MAD";
  if (cc && EU_COUNTRIES.has(cc)) return "EUR";
  return "USD";
}

const FX_FROM_MAD: Record<Currency, number> = { MAD: 1, EUR: 1 / 10.85, USD: 1 / 10.05 };

export function convertFromMAD(amountMAD: number, currency: Currency): number {
  return Math.round((amountMAD || 0) * (FX_FROM_MAD[currency] || 1));
}

export function formatMoney(amountMAD: number, currency: Currency): string {
  if (!amountMAD) return "Gratuit";
  const val = convertFromMAD(amountMAD, currency);
  if (currency === "EUR") return `${val} €`;
  if (currency === "USD") return `$${val}`;
  return `${val} DH`;
}

/**
 * Détection du pays côté serveur à partir de l'en-tête envoyé par la plateforme
 * d'hébergement. Vercel ajoute automatiquement `x-vercel-ip-country`.
 * En local (dev) cet en-tête est absent : la devise par défaut (MAD) s'applique.
 * Utilisée pour la devise de l'abonnement (indépendante de la connexion,
 * qui se fait désormais par email pour le propriétaire).
 */
export function countryFromHeaders(headers: Headers): string | null {
  return headers.get("x-vercel-ip-country") || null;
}
