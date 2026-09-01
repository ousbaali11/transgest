import Twilio from "twilio";
import * as plivo from "plivo";

/**
 * Envoi du code de vérification par SMS — plusieurs fournisseurs supportés,
 * choisis automatiquement selon les variables d'environnement présentes,
 * dans cet ordre de priorité :
 *
 * 1) Twilio (actif) — infrastructure cloud, aucun matériel requis.
 *    Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 *
 * 2) Plivo — alternative moins chère une fois payant, conservée en repli
 *    si Twilio n'est pas configuré (l'inscription Plivo peut être
 *    indisponible selon les régions — vérifié le cas pour ce projet).
 *    Variables : PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_FROM_NUMBER.
 *
 * 3) textbee.dev — gratuit (300 SMS/mois) mais nécessite un téléphone
 *    Android dédié, allumé en permanence, comme passerelle d'envoi.
 *    Variables : TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID.
 *
 * Si aucun de ces fournisseurs n'est configuré : mode développement, le
 * code est journalisé côté serveur au lieu d'être envoyé.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const message = `Votre code TransGest : ${code}`;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({ to: phone, from: TWILIO_FROM_NUMBER, body: message });
    return;
  }

  const { PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_FROM_NUMBER } = process.env;
  if (PLIVO_AUTH_ID && PLIVO_AUTH_TOKEN && PLIVO_FROM_NUMBER) {
    const client = new plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);
    await client.messages.create(PLIVO_FROM_NUMBER, phone, message);
    return;
  }

  const { TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID } = process.env;
  if (TEXTBEE_API_KEY && TEXTBEE_DEVICE_ID) {
    const res = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": TEXTBEE_API_KEY },
      body: JSON.stringify({ recipients: [phone], message }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`textbee : échec de l'envoi (HTTP ${res.status}) ${detail}`);
    }
    return;
  }

  console.log(`[SMS DEV] Code de vérification pour ${phone} : ${code}`);
}
