import { headers } from "next/headers";
import { DIAL_CODES } from "@/lib/currency";
import { getPlatformSettings } from "@/lib/settings";
import LoginForm from "./LoginForm";

/**
 * Détection réelle du pays à partir de l'IP du visiteur (en-tête ajouté
 * automatiquement par Vercel). Absent en développement local — dans ce cas
 * LoginForm se rabat sur une détection côté navigateur (langue/fuseau horaire).
 */
function resolveInitialCountry(): string {
  const detected = headers().get("x-vercel-ip-country");
  if (detected && DIAL_CODES[detected]) return detected;
  if (detected) return "OTHER"; // pays détecté mais absent de notre liste d'indicatifs
  return "";
}

export default async function LoginPage() {
  const settings = await getPlatformSettings();
  const initialCountryCode = resolveInitialCountry();

  return (
    <LoginForm
      appName={settings.appName}
      logoEmoji={settings.logoEmoji}
      logoType={settings.logoType}
      logoImage={settings.logoImage}
      initialCountryCode={initialCountryCode}
    />
  );
}
