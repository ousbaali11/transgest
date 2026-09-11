import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { assertActionVerified } from "@/lib/admin-action";
import { UI_THEMES } from "@/lib/ui-theme";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

// Réservé à l'admin (déjà protégé par requireAdminSession), mais une liste
// blanche reste la bonne pratique : "singleton" étant un ID fixe connu,
// mieux vaut ne jamais dépendre uniquement du contrôle d'accès en amont.
//
// Les couleurs sont injectées telles quelles dans un attribut style et
// dérivées en "--primary-10" par concaténation d'un suffixe alpha : seul un
// hexadécimal à 6 chiffres donne un résultat correct — tout autre format
// est refusé.
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const patchSchema = z.object({
  appName: z.string().min(1).max(60).optional(),
  logoType: z.enum(["emoji", "image"]).optional(),
  uiTheme: z.enum(UI_THEMES).optional(),
  advancedAccent: z.enum(["gray", "blue"]).optional(),
  logoEmoji: z.string().max(8).optional(),
  logoImage: z.string().max(2_000_000).nullable().optional(), // data URL (≈ 900 Ko d'image, limite déjà côté interface)
  logoSize: z.number().int().min(24).max(96).optional(),
  themePrimary: z.string().regex(HEX_COLOR).optional(),
  themeAccent: z.string().regex(HEX_COLOR).optional(),
  forcedPlanId: z.string().nullable().optional(),
  stripeEnabled: z.boolean().optional(),
  paypalEnabled: z.boolean().optional(),
  manualPaymentCountries: z.array(z.string().length(2)).optional(),
  contactEmail: z.union([z.literal(""), z.string().email()]).nullable().optional(),
  contactWhatsapp: z.string().max(30).regex(/^[+0-9 ()-]*$/).nullable().optional(),
});

// Pas de GET : l'ancienne lecture publique (sans aucune session) exposait
// la configuration complète, identifiants de prix Stripe/PayPal compris, à
// n'importe quel visiteur — et n'était utilisée nulle part (la page Admin
// lit ces réglages côté serveur).

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(getLocale(), "invalid_request_error") }, { status: 400 });
    const data = { ...parsed.data };

    // Changer l'email de contact exige une vérification par code — mais
    // seulement s'il y en avait déjà un configuré (voir la même règle
    // côté interface dans AdminSettingsPanel : rien à protéger la toute
    // première fois, puisqu'aucun email de confiance n'existe encore).
    if (data.contactEmail !== undefined) {
      const current = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
      if (current?.contactEmail) {
        await assertActionVerified("CHANGE_CONTACT_EMAIL");
      }
      if (data.contactEmail === "") data.contactEmail = null;
    }
    if (data.contactWhatsapp === "") data.contactWhatsapp = null;

    // Une formule forcée doit exister : sinon la contrainte de clé
    // étrangère renvoyait une erreur trompeuse ("éléments liés existants").
    if (data.forcedPlanId) {
      const plan = await prisma.plan.findUnique({ where: { id: data.forcedPlanId } });
      if (!plan) return NextResponse.json({ error: t(getLocale(), "plan_not_found_error") }, { status: 404 });
    }

    const settings = await prisma.platformSettings.update({ where: { id: "singleton" }, data });
    return NextResponse.json(settings);
  } catch (e) {
    return handleApiError(e);
  }
}
