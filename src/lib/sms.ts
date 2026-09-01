import Twilio from "twilio";

/**
 * Envoi du code de vérification par SMS.
 *
 * Sans les variables TWILIO_* dans .env, le code est simplement journalisé
 * côté serveur (mode développement / démo) — aucun SMS réel n'est envoyé.
 * Dès que TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM_NUMBER sont
 * renseignés, les vrais SMS partent automatiquement via Twilio.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  const hasTwilio = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER;

  if (!hasTwilio) {
    console.log(`[SMS DEV] Code de vérification pour ${phone} : ${code}`);
    return;
  }

  const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await client.messages.create({
    to: phone,
    from: TWILIO_FROM_NUMBER,
    body: `Votre code TransGest : ${code}`,
  });
}
