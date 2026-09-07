import { Resend } from "resend";

/** Échappe les caractères HTML spéciaux — indispensable avant d'insérer une
 * valeur saisie par un visiteur (formulaire de contact) dans un email HTML,
 * pour empêcher toute injection de balises/scripts dans l'email reçu par
 * l'administrateur. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

/**
 * Notifie l'administrateur qu'une nouvelle demande a été déposée depuis le
 * formulaire "Nous contacter" (compte bloqué qui veut arranger un paiement
 * manuel). Best-effort : appelée dans un try/catch par la route, un échec
 * d'envoi ne doit jamais empêcher l'enregistrement de la demande.
 */
export async function sendContactRequestNotification(
  to: string,
  appName: string,
  request: { firstName: string; lastName: string; phone: string; country: string; email: string; subject: string; message: string }
): Promise<void> {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env;

  if (!RESEND_API_KEY) {
    console.log(`[EMAIL DEV] Nouvelle demande de contact pour ${to} :`, request);
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  const from = RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const safe = {
    firstName: escapeHtml(request.firstName), lastName: escapeHtml(request.lastName),
    phone: escapeHtml(request.phone), country: escapeHtml(request.country),
    email: escapeHtml(request.email), subject: escapeHtml(request.subject),
    message: escapeHtml(request.message),
  };

  const { error } = await resend.emails.send({
    from: `${appName} <${from}>`,
    to,
    subject: `Nouvelle demande de contact — ${safe.subject}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #16305B;">Nouvelle demande de contact</h2>
        <p><strong>${safe.firstName} ${safe.lastName}</strong> (${safe.country})</p>
        <p>Téléphone : ${safe.phone}<br/>Email : ${safe.email}</p>
        <p><strong>Objet :</strong> ${safe.subject}</p>
        <p style="white-space: pre-wrap; background: #F6F4EF; padding: 12px; border-radius: 8px;">${safe.message}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend : échec de l'envoi (${error.name}) ${error.message}`);
  }
}
