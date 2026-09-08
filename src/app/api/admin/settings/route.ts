import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, handleApiError } from "@/lib/guards";
import { assertActionVerified } from "@/lib/admin-action";

// Réservé à l'admin (déjà protégé par requireAdminSession), mais une liste
// blanche reste la bonne pratique : "singleton" étant un ID fixe connu,
// mieux vaut ne jamais dépendre uniquement du contrôle d'accès en amont.
const patchSchema = z.object({
  appName: z.string().min(1).optional(),
  logoType: z.enum(["emoji", "image"]).optional(),
  uiTheme: z.enum(["classic", "advanced"]).optional(),
  advancedAccent: z.enum(["gray", "blue"]).optional(),
  logoEmoji: z.string().optional(),
  logoImage: z.string().nullable().optional(),
  logoSize: z.number().int().positive().optional(),
  themePrimary: z.string().optional(),
  themeAccent: z.string().optional(),
  forcedPlanId: z.string().nullable().optional(),
  stripeEnabled: z.boolean().optional(),
  paypalEnabled: z.boolean().optional(),
  manualPaymentCountries: z.array(z.string()).optional(),
  contactEmail: z.string().nullable().optional(),
  contactWhatsapp: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const plans = await prisma.plan.findMany();
    return NextResponse.json({ settings, plans });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    // Changer l'email de contact exige une vérification par code — mais
    // seulement s'il y en avait déjà un configuré (voir la même règle
    // côté interface dans AdminSettingsPanel : rien à protéger la toute
    // première fois, puisqu'aucun email de confiance n'existe encore).
    if (parsed.data.contactEmail !== undefined) {
      const current = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
      if (current?.contactEmail) {
        await assertActionVerified("CHANGE_CONTACT_EMAIL");
      }
    }

    const settings = await prisma.platformSettings.update({ where: { id: "singleton" }, data: parsed.data });
    return NextResponse.json(settings);
  } catch (e) {
    return handleApiError(e);
  }
}
