export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export const DIAL_CODES: Record<string, { name: string; dial: string }> = {
  MA: { name: "Maroc", dial: "+212" },
  FR: { name: "France", dial: "+33" },
  ES: { name: "Espagne", dial: "+34" },
  DE: { name: "Allemagne", dial: "+49" },
  IT: { name: "Italie", dial: "+39" },
  PT: { name: "Portugal", dial: "+351" },
  BE: { name: "Belgique", dial: "+32" },
  NL: { name: "Pays-Bas", dial: "+31" },
  LU: { name: "Luxembourg", dial: "+352" },
  IE: { name: "Irlande", dial: "+353" },
  AT: { name: "Autriche", dial: "+43" },
  GR: { name: "Grèce", dial: "+30" },
  FI: { name: "Finlande", dial: "+358" },
  SE: { name: "Suède", dial: "+46" },
  DK: { name: "Danemark", dial: "+45" },
  PL: { name: "Pologne", dial: "+48" },
  CZ: { name: "Tchéquie", dial: "+420" },
  RO: { name: "Roumanie", dial: "+40" },
  DZ: { name: "Algérie", dial: "+213" },
  TN: { name: "Tunisie", dial: "+216" },
  US: { name: "États-Unis", dial: "+1" },
  CA: { name: "Canada", dial: "+1" },
  GB: { name: "Royaume-Uni", dial: "+44" },
};

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
 */
export function countryFromHeaders(headers: Headers): string | null {
  return headers.get("x-vercel-ip-country") || null;
}
