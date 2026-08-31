/**
 * Interface d'envoi de SMS, volontairement minimale.
 *
 * En développement (ou tant que TWILIO_* n'est pas configuré), le code est
 * simplement journalisé côté serveur — aucun SMS réel n'est envoyé.
 *
 * Pour la production, branchez un vrai fournisseur (Twilio, Vonage, un
 * agrégateur local marocain, etc.) dans sendOtpSms ci-dessous.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER;

  if (!hasTwilio) {
    console.log(`[SMS DEV] Code de vérification pour ${phone} : ${code}`);
    return;
  }

  // Exemple d'intégration Twilio (installez le SDK `twilio` pour l'activer) :
  //
  // const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({
  //   to: phone,
  //   from: process.env.TWILIO_FROM_NUMBER,
  //   body: `Votre code TransGest : ${code}`,
  // });

  console.log(`[SMS] Identifiants Twilio détectés mais SDK non installé — code pour ${phone} : ${code}`);
}
