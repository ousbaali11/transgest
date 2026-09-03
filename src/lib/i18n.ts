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
  confirm_action: { fr: "Confirmer", en: "Confirm", ary: "أكد" },
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

  // Voyages
  trips_new: { fr: "Nouveau voyage", en: "New trip", ary: "سفرية جديدة" },
  trips_edit: { fr: "Modifier le voyage", en: "Edit trip", ary: "بدل السفرية" },
  trips_empty: { fr: "Aucun voyage enregistré.", en: "No trips recorded.", ary: "ما كاين حتى سفرية." },
  field_driver: { fr: "Chauffeur", en: "Driver", ary: "السائق" },
  field_departure: { fr: "Départ", en: "Departure", ary: "المغادرة" },
  field_destination: { fr: "Destination", en: "Destination", ary: "الوجهة" },
  field_km_departure: { fr: "Km départ", en: "Start km", ary: "كم البداية" },
  field_km_arrival: { fr: "Km arrivée", en: "End km", ary: "كم الوصول" },
  field_no_client: { fr: "Sans client", en: "No client", ary: "بلا زبون" },
  field_merchandise: { fr: "Marchandise", en: "Goods", ary: "البضاعة" },
  field_transport_price: { fr: "Prix transport (DH)", en: "Transport price", ary: "تمن النقل" },
  field_advance: { fr: "Avance (DH)", en: "Advance", ary: "التسبيق" },
  saving: { fr: "Enregistrement…", en: "Saving…", ary: "كيتسجل…" },
  invoice_generate: { fr: "Générer une facture", en: "Generate invoice", ary: "دير الفاكتورة" },
  invoice_paid: { fr: "Payée", en: "Paid", ary: "خلاصة" },
  invoice_pending: { fr: "En attente", en: "Pending", ary: "فالانتظار" },
  not_assigned: { fr: "Non assigné", en: "Unassigned", ary: "ماشي معين" },
  no_client: { fr: "Sans client", en: "No client", ary: "بلا زبون" },

  // Détail voyage / Bénéfice
  benefit_title: { fr: "Bénéfice", en: "Profit", ary: "الربح" },
  trip_price: { fr: "Prix du voyage", en: "Trip price", ary: "تمن السفرية" },
  total_expenses: { fr: "Total des dépenses", en: "Total expenses", ary: "مجموع المصاريف" },
  net_profit: { fr: "Bénéfice net", en: "Net profit", ary: "الربح الصافي" },
  details: { fr: "Détails", en: "Details", ary: "التفاصيل" },
  distance_traveled: { fr: "Distance parcourue", en: "Distance traveled", ary: "المسافة المقطوعة" },
  cost_per_km: { fr: "Coût par km", en: "Cost per km", ary: "التكلفة لكل كم" },
  profit_per_km: { fr: "Bénéfice par km", en: "Profit per km", ary: "الربح لكل كم" },
  trip_section: { fr: "Voyage", en: "Trip", ary: "السفرية" },
  back_to_trips: { fr: "Retour aux voyages", en: "Back to trips", ary: "رجوع للسفريات" },

  // Dépenses
  expenses_new: { fr: "Nouvelle dépense", en: "New expense", ary: "مصروف جديد" },
  expenses_edit: { fr: "Modifier la dépense", en: "Edit expense", ary: "بدل المصروف" },
  category_fuel: { fr: "Carburant", en: "Fuel", ary: "الغازوال" },
  category_toll: { fr: "Péage", en: "Toll", ary: "الطريق السيار" },
  category_other: { fr: "Autres", en: "Other", ary: "خرين" },
  field_linked_trip: { fr: "Voyage lié (optionnel)", en: "Linked trip (optional)", ary: "السفرية المرتبطة (اختياري)" },
  field_quantity_l: { fr: "Quantité (L)", en: "Quantity (L)", ary: "الكمية (لتر)" },
  field_unit_price: { fr: "Prix unitaire (DH/L)", en: "Unit price", ary: "تمن اللتر" },
  field_amount: { fr: "Montant (DH)", en: "Amount", ary: "المبلغ" },
  total_expense_label: { fr: "Dépense totale : ", en: "Total expense: ", ary: "مجموع المصروف: " },
  field_notes: { fr: "Notes", en: "Notes", ary: "ملاحظات" },
  save_changes: { fr: "Enregistrer les modifications", en: "Save changes", ary: "سجل التبديلات" },

  // Factures
  invoices_all: { fr: "Toutes", en: "All", ary: "الكل" },
  invoices_paid: { fr: "Payées", en: "Paid", ary: "خلاصين" },
  invoices_pending: { fr: "En attente", en: "Pending", ary: "فالانتظار" },
  invoices_empty_paid: { fr: "Aucune facture payée pour l'instant.", en: "No paid invoices yet.", ary: "ماكاين حتى فاكتورة خلاصة." },
  invoices_empty_pending: { fr: "Aucune facture en attente.", en: "No pending invoices.", ary: "ماكاين حتى فاكتورة فالانتظار." },
  invoices_empty_all: { fr: "Aucune facture. Générez-en une depuis le détail d'un voyage.", en: "No invoices. Generate one from a trip's detail page.", ary: "ماكاين حتى فاكتورة. دير وحدة من تفاصيل السفرية." },
  download_pdf: { fr: "Télécharger PDF", en: "Download PDF", ary: "حمل PDF" },

  // Camions & chauffeurs
  fleet_trucks: { fr: "Camions", en: "Trucks", ary: "الكاميونات" },
  field_plate: { fr: "Immatriculation", en: "License plate", ary: "رقم الطومبيلة" },
  field_brand: { fr: "Marque", en: "Brand", ary: "الماركة" },
  field_model: { fr: "Modèle", en: "Model", ary: "الموديل" },
  field_capacity: { fr: "Capacité", en: "Capacity", ary: "الحمولة" },
  doc_deadlines_hide: { fr: "Masquer les échéances documents", en: "Hide document deadlines", ary: "خبي تواريخ الوثائق" },
  doc_deadlines_show: { fr: "+ Échéances documents (assurance, visite technique...)", en: "+ Document deadlines (insurance, inspection...)", ary: "+ تواريخ الوثائق (التأمين، الزيارة التقنية...)" },
  field_insurance: { fr: "Assurance", en: "Insurance", ary: "التأمين" },
  field_tech_inspection: { fr: "Visite technique", en: "Technical inspection", ary: "الزيارة التقنية" },
  field_sticker: { fr: "Vignette", en: "Sticker", ary: "الفينيات" },
  add_truck: { fr: "Ajouter le camion", en: "Add truck", ary: "زيد الكاميون" },
  doc_expired: { fr: "expirée", en: "expired", ary: "فاتت" },
  expires_in_days: { fr: "expire dans {n} j", en: "expires in {n} d", ary: "غادي تفوت من {n} يوم" },
  fleet_drivers: { fr: "Chauffeurs", en: "Drivers", ary: "الشوافر" },
  driver_code_hint: {
    fr: "Chaque chauffeur reçoit un code à 16 chiffres pour se connecter — communiquez-le-lui directement, aucun SMS n'est envoyé. Il ne voit et ne modifie que ses propres voyages et dépenses.",
    en: "Each driver gets a 16-digit code to log in — give it to them directly, no SMS is sent. They only see and edit their own trips and expenses.",
    ary: "كل شافر كيتسنى ليه كود ديال 16 رقم باش يدخل — عطيه ليه بيدك، ماكاين حتى SMS. كيشوف وكيبدل غير السفريات والمصاريف ديالو.",
  },
  add_myself_driver: { fr: "+ Je suis moi-même l'un des chauffeurs", en: "+ I'm one of the drivers myself", ary: "+ أنا نفسي واحد من الشوافر" },
  field_full_name: { fr: "Nom complet", en: "Full name", ary: "الاسم الكامل" },
  field_phone_optional: { fr: "Téléphone (optionnel)", en: "Phone (optional)", ary: "التيليفون (اختياري)" },
  assigned_truck: { fr: "Camion assigné", en: "Assigned truck", ary: "الكاميون المعين" },
  add_driver: { fr: "Ajouter le chauffeur", en: "Add driver", ary: "زيد الشافر" },
  you_own_account: { fr: "Vous — connecté(e) via votre propre compte", en: "You — logged in via your own account", ary: "نتا — داخل من الكونط ديالك" },
  driver_login_code_label: { fr: "Code de connexion — à communiquer au chauffeur", en: "Login code — share it with the driver", ary: "كود الدخول — عطيه للشافر" },
  copy: { fr: "Copier", en: "Copy", ary: "نسخ" },
  copied: { fr: "Copié ✓", en: "Copied ✓", ary: "تنسخ ✓" },
  hide: { fr: "Masquer", en: "Hide", ary: "خبي" },
  view_code: { fr: "Voir le code", en: "View code", ary: "شوف الكود" },
  regenerate: { fr: "Régénérer", en: "Regenerate", ary: "جدد" },

  // Clients
  clients_new: { fr: "Nouveau client", en: "New client", ary: "زبون جديد" },
  field_name: { fr: "Nom", en: "Name", ary: "الاسم" },
  field_phone: { fr: "Téléphone", en: "Phone", ary: "التيليفون" },
  field_email: { fr: "Email", en: "Email", ary: "البريد الإلكتروني" },
  field_address: { fr: "Adresse", en: "Address", ary: "العنوان" },
  client_title: { fr: "Client", en: "Client", ary: "الزبون" },
  add_client: { fr: "Ajouter le client", en: "Add client", ary: "زيد الزبون" },
  client_trips_tab: { fr: "Voyages", en: "Trips", ary: "السفريات" },
  client_invoices_tab: { fr: "Factures", en: "Invoices", ary: "الفاكتورات" },
  client_no_trips: { fr: "Aucun voyage pour ce client.", en: "No trips for this client.", ary: "ماكاين حتى سفرية لهاد الزبون." },
  client_no_invoices: { fr: "Aucune facture pour ce client.", en: "No invoices for this client.", ary: "ماكاين حتى فاكتورة لهاد الزبون." },
  profit_label: { fr: "Bénéfice : ", en: "Profit: ", ary: "الربح: " },
  phone_label: { fr: "Téléphone", en: "Phone", ary: "التيليفون" },
  email_label: { fr: "Email", en: "Email", ary: "البريد" },
  address_label: { fr: "Adresse", en: "Address", ary: "العنوان" },
  notes_label: { fr: "Notes", en: "Notes", ary: "ملاحظات" },

  // Colonnes personnalisées
  columns_add: { fr: "Ajouter une colonne", en: "Add a column", ary: "زيد عمود" },
  columns_trips_option: { fr: "Voyages", en: "Trips", ary: "السفريات" },
  columns_expenses_option: { fr: "Dépenses", en: "Expenses", ary: "المصاريف" },
  columns_text_type: { fr: "Texte", en: "Text", ary: "نص" },
  columns_number_type: { fr: "Nombre", en: "Number", ary: "رقم" },
  field_column_name: { fr: "Nom de la colonne (ex: N° de plomb)", en: "Column name (e.g. Seal number)", ary: "سمية العمود (مثلا: رقم الرصاصة)" },
  add_column: { fr: "Ajouter la colonne", en: "Add column", ary: "زيد العمود" },
  trip_columns: { fr: "Colonnes des voyages", en: "Trip columns", ary: "أعمدة السفريات" },
  expense_columns: { fr: "Colonnes des dépenses", en: "Expense columns", ary: "أعمدة المصاريف" },
  no_custom_columns: { fr: "Aucune colonne personnalisée.", en: "No custom columns.", ary: "ماكاين حتى عمود خاص." },
  columns_intro: {
    fr: "Ajoutez des champs propres à votre activité (ex : n° de plomb, type de remorque). Ils apparaissent dans les formulaires de voyage/dépense et dans l'export Excel.",
    en: "Add fields specific to your business (e.g. seal number, trailer type). They appear in the trip/expense forms and in the Excel export.",
    ary: "زيد حقول خاصة بالخدمة ديالك (مثلا: رقم الرصاصة، نوع الرمورك). كيبانو فاستمارات السفرية/المصروف وفتصدير Excel.",
  },

  // Réglages
  my_subscription: { fr: "Mon abonnement", en: "My subscription", ary: "الاشتراك ديالي" },
  offered_by_admin: { fr: "Offert par l'administrateur", en: "Offered by the admin", ary: "عطاه الإدارة" },
  unlimited_access: { fr: "accès illimité", en: "unlimited access", ary: "دخول بلا حد" },
  until: { fr: "jusqu'au", en: "until", ary: "حتى" },
  cancelled_access_until: { fr: "Résilié — accès jusqu'au", en: "Cancelled — access until", ary: "متفسخ — الدخول حتى" },
  renewal_on: { fr: "Renouvellement le", en: "Renews on", ary: "التجديد" },
  offered_cannot_cancel: {
    fr: "Cet abonnement vous a été offert par l'administrateur — il ne peut pas être résilié depuis l'application.",
    en: "This subscription was offered by the admin — it cannot be cancelled from the app.",
    ary: "هاد الاشتراك عطاهولك الإدارة — ما يمكنش تفسخو من التطبيق.",
  },
  driver_account_title: { fr: "Compte chauffeur", en: "Driver account", ary: "الكونط ديال السائق" },
  driver_account_desc: {
    fr: "Vous pouvez saisir vos voyages et vos dépenses. La gestion de la flotte, des clients et de l'abonnement est réservée au propriétaire.",
    en: "You can enter your trips and expenses. Fleet, client and subscription management is reserved to the owner.",
    ary: "تقدر تدخل السفريات والمصاريف ديالك. تسيير الفلوطة والزبناء والاشتراك خاص بالمالك.",
  },
  account_label: { fr: "Compte", en: "Account", ary: "الكونط" },
  reactivate_subscription: { fr: "Réactiver l'abonnement", en: "Reactivate subscription", ary: "رجع الاشتراك" },
  cancel_subscription: { fr: "Résilier l'abonnement", en: "Cancel subscription", ary: "فسخ الاشتراك" },
  cancel_subscription_warning: {
    fr: "Vous garderez l'accès jusqu'à la fin de la période déjà payée, puis le compte se verrouillera.",
    en: "You'll keep access until the end of the period already paid, then the account will lock.",
    ary: "غادي يبقى ليك الدخول حتى نهاية المدة اللي خلصتي، من بعد الكونط غادي يتسد.",
  },
} as const;

export type TKey = keyof typeof dict;

export function t(locale: Locale, key: TKey): string {
  return dict[key]?.[locale] || dict[key]?.[DEFAULT_LOCALE] || String(key);
}
