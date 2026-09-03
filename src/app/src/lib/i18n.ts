export const locales = ["fr", "en", "ary"] as const;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "locale";

export const localeInfo: Record<Locale, { label: string; flag: string; dir: "ltr" | "rtl" }> = {
  fr: { label: "Français", flag: "🇫🇷", dir: "ltr" },
  en: { label: "English", flag: "🇬🇧", dir: "ltr" },
  ary: { label: "الدارجة", flag: "🇲🇦", dir: "rtl" },
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (locales as readonly string[]).includes(v);
}

/**
 * Dictionnaire de traduction. Volontairement centralisé en un seul fichier
 * (plutôt qu'un fichier par langue) pour qu'ajouter une clé oblige à
 * renseigner les 3 langues côte à côte, et repérer immédiatement un oubli.
 *
 * Cette première passe couvre l'ossature commune à tout l'site (barre du
 * haut, barre du bas, connexion, tableau de bord, actions génériques). Le
 * reste du site continue de s'afficher en français tant qu'il n'a pas
 * encore été traduit — c'est un chantier volontairement progressif.
 */
const dict = {
  // Barre du haut / navigation
  nav_home: { fr: "Accueil", en: "Home", ary: "الرئيسية" },
  nav_trips: { fr: "Voyages", en: "Trips", ary: "السفريات" },
  nav_expenses: { fr: "Dépenses", en: "Expenses", ary: "المصاريف" },
  nav_invoices: { fr: "Factures", en: "Invoices", ary: "الفاكتورات" },
  nav_more: { fr: "Plus", en: "More", ary: "كتر" },
  nav_settings: { fr: "Réglages", en: "Settings", ary: "الإعدادات" },
  nav_logout: { fr: "Se déconnecter", en: "Log out", ary: "خروج" },
  nav_fleet: { fr: "Camions & chauffeurs", en: "Trucks & drivers", ary: "الكاميونات و الشوافر" },
  nav_clients: { fr: "Clients", en: "Clients", ary: "الزبناء" },
  nav_custom_fields: { fr: "Colonnes personnalisées", en: "Custom fields", ary: "الأعمدة الخاصة" },
  nav_export_excel: { fr: "Exporter en Excel", en: "Export to Excel", ary: "تصدير Excel" },
  nav_language: { fr: "Langue", en: "Language", ary: "اللغة" },

  // Générique
  save: { fr: "Enregistrer", en: "Save", ary: "سجل" },
  cancel: { fr: "Annuler", en: "Cancel", ary: "إلغاء" },
  delete: { fr: "Supprimer", en: "Delete", ary: "حيد" },
  edit: { fr: "Modifier", en: "Edit", ary: "بدل" },
  confirm: { fr: "Confirmer ?", en: "Confirm?", ary: "متأكد؟" },
  back: { fr: "Retour", en: "Back", ary: "رجوع" },
  loading: { fr: "Chargement…", en: "Loading…", ary: "كيتحمل…" },

  // Connexion
  login_owner: { fr: "Je suis propriétaire", en: "I'm the owner", ary: "أنا المالك" },
  login_driver: { fr: "Je suis chauffeur", en: "I'm a driver", ary: "أنا السائق" },
  login_email: { fr: "Adresse email", en: "Email address", ary: "البريد الإلكتروني" },
  login_receive_code: { fr: "Recevoir le code", en: "Receive code", ary: "صيفط ليا الكود" },
  login_verify: { fr: "Vérifier", en: "Verify", ary: "تأكد" },
  login_resend: { fr: "Renvoyer le code", en: "Resend code", ary: "عاود صيفط الكود" },
  login_driver_code: { fr: "Code chauffeur (16 chiffres)", en: "Driver code (16 digits)", ary: "كود السائق (16 رقم)" },
  login_driver_hint: { fr: "Ce code vous a été communiqué par le propriétaire de la flotte.", en: "This code was given to you by the fleet owner.", ary: "هاد الكود عطاهولك صاحب الفلوطة." },
  login_connect: { fr: "Se connecter", en: "Log in", ary: "دخول" },
  login_admin_area: { fr: "Espace administrateur", en: "Admin area", ary: "فضاء الإدارة" },

  // Tableau de bord
  dashboard_greeting: { fr: "Bonjour 👋", en: "Hello 👋", ary: "السلام 👋" },
  dashboard_summary: { fr: "Voici le résumé de votre activité", en: "Here's a summary of your activity", ary: "هادي خلاصة ديال الخدمة ديالك" },
  dashboard_trips_this_month: { fr: "Voyages ce mois", en: "Trips this month", ary: "السفريات هاد الشهر" },
  dashboard_revenue: { fr: "Chiffre d'affaires", en: "Revenue", ary: "رقم المعاملات" },
  dashboard_total_expenses: { fr: "Dépenses totales", en: "Total expenses", ary: "مجموع المصاريف" },
  dashboard_net_profit: { fr: "Bénéfice net", en: "Net profit", ary: "الربح الصافي" },
  dashboard_recent_trips: { fr: "Voyages récents", en: "Recent trips", ary: "آخر السفريات" },
  dashboard_view_all: { fr: "Voir tout", en: "View all", ary: "شوف الكل" },
  dashboard_no_trips: { fr: "Aucun voyage enregistré", en: "No trips recorded", ary: "ما كاين حتى سفرية" },
  dashboard_new_trip: { fr: "Nouveau voyage", en: "New trip", ary: "سفرية جديدة" },
  dashboard_load_example: { fr: "Charger un exemple", en: "Load an example", ary: "حمل مثال" },
} as const;

export type TKey = keyof typeof dict;

export function t(locale: Locale, key: TKey): string {
  return dict[key]?.[locale] || dict[key]?.[DEFAULT_LOCALE] || String(key);
}
