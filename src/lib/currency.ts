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

const TZ_COUNTRY: Record<string, string> = {
  "Africa/Casablanca": "MA", "Africa/El_Aaiun": "MA",
  "Europe/Paris": "FR", "Europe/Madrid": "ES", "Europe/Berlin": "DE", "Europe/Rome": "IT",
  "Europe/Lisbon": "PT", "Europe/Brussels": "BE", "Europe/Amsterdam": "NL", "Europe/Luxembourg": "LU",
  "Europe/Dublin": "IE", "Europe/Vienna": "AT", "Europe/Athens": "GR", "Europe/Helsinki": "FI",
  "Europe/Stockholm": "SE", "Europe/Copenhagen": "DK", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
  "Europe/Bucharest": "RO", "Europe/London": "GB",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "America/Toronto": "CA",
  "Africa/Algiers": "DZ", "Africa/Tunis": "TN",
};

/**
 * Détection du pays côté navigateur (repli utilisé quand l'en-tête serveur
 * n'est pas disponible, typiquement en développement local). Se base sur les
 * réglages de langue/fuseau horaire de l'appareil — aucune requête réseau.
 */
export function detectCountryCodeClient(): string | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  try {
    const loc = new Intl.Locale(navigator.language) as Intl.Locale & { region?: string };
    if (loc.region) return loc.region.toUpperCase();
  } catch {}
  try {
    for (const l of navigator.languages || [navigator.language || ""]) {
      const m = /-([A-Za-z]{2})$/.exec(l || "");
      if (m) return m[1].toUpperCase();
    }
  } catch {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  } catch {}
  return null;
}
