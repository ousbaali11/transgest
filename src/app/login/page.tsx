import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  // Une session valide existe déjà (l'utilisateur ne s'est jamais
  // déconnecté) : direction sa page connectée, sans jamais repasser par
  // l'écran de connexion — peu importe l'appareil ou la façon dont il
  // atterrit sur cette page (raccourci, favori, PWA...).
  // getValidSession (et non getSession) : un cookie de chauffeur dont le
  // profil a été supprimé ou le code régénéré n'est PAS une session valide
  // — sinon /login renverrait vers /dashboard, qui renverrait vers /login,
  // en boucle.
  const session = await getValidSession();
  if (session?.role === "PLATFORM_ADMIN") redirect("/admin");
  if (session?.role === "OWNER" || session?.role === "DRIVER") redirect("/dashboard");

  const settings = await getPlatformSettings();
  const locale = getLocale();

  return (
    <LoginForm
      appName={settings.appName}
      logoEmoji={settings.logoEmoji}
      logoType={settings.logoType}
      logoImage={settings.logoImage}
      uiTheme={settings.uiTheme}
      locale={locale}
    />
  );
}
