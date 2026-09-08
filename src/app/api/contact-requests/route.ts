import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, handleApiError } from "@/lib/guards";
import { getPlatformSettings } from "@/lib/settings";
import { sendContactRequestNotification } from "@/lib/email";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

const bodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  country: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

/**
 * Formulaire "Nous contacter" de l'écran d'abonnement — pour un compte
 * bloqué (verrouillé ou sans moyen de paiement automatique disponible)
 * qui veut arranger un paiement manuel avec l'administrateur.
 *
 * Réservé à un propriétaire déjà authentifié (le formulaire n'apparaît que
 * sur /abonnement) — mais n'exige volontairement PAS un abonnement actif,
 * puisque c'est justement le cas bloqué qui amène à ce formulaire.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireOwnerSession();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: t(getLocale(), "invalid_request_error") }, { status: 400 });

    const request = await prisma.contactRequest.create({
      data: { ...parsed.data, organizationId: session.organizationId },
    });

    // Notification best-effort à l'admin — un échec d'envoi ne doit jamais
    // empêcher l'enregistrement de la demande elle-même (déjà en base).
    try {
      const settings = await getPlatformSettings();
      const notifyTo = settings.contactEmail || process.env.ADMIN_EMAIL;
      if (notifyTo) {
        await sendContactRequestNotification(notifyTo, settings.appName, parsed.data);
      }
    } catch (e) {
      console.error("Échec de notification admin (nouvelle demande de contact) :", e);
    }

    return NextResponse.json({ ok: true, id: request.id });
  } catch (e) {
    return handleApiError(e);
  }
}
