import { Resend } from "resend";

/**
 * Envoi du code de connexion par email (propriétaire). Contrairement au SMS,
 * l'email n'a pas de restriction par pays/opérateur à configurer — pas de
 * permissions géographiques, pas d'expéditeur à faire approuver par pays.
 *
 * Sans RESEND_API_KEY, le code est journalisé côté serveur au lieu d'être
 * envoyé (mode développement / démo).
 */
export async function sendLoginCodeEmail(email: string, code: string, appName: string): Promise<void> {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env;

  if (!RESEND_API_KEY) {
    console.log(`[EMAIL DEV] Code de connexion pour ${email} : ${code}`);
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  const from = RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: `${appName} <${from}>`,
    to: email,
    subject: `Votre code de connexion ${appName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #16305B;">${appName}</h2>
        <p>Voici votre code de connexion :</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #16305B; padding: 16px 0;">${code}</div>
        <p style="color: #6B7280; font-size: 13px;">Ce code expire dans 5 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend : échec de l'envoi (${error.name}) ${error.message}`);
  }
}
