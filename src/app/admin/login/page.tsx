import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";
import { getLocale } from "@/lib/get-locale";
import { getPlatformSettings } from "@/lib/settings";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  // Même principe que /login : une session valide déjà présente saute
  // directement à la bonne destination, sans jamais réafficher un
  // formulaire de connexion à quelqu'un déjà connecté.
  const session = await getValidSession();
  if (session?.role === "PLATFORM_ADMIN") redirect("/admin");
  if (session?.role === "OWNER" || session?.role === "DRIVER") redirect("/dashboard");

  const locale = getLocale();
  const settings = await getPlatformSettings();
  return (
    <AdminLoginForm
      locale={locale}
      appName={settings.appName}
      logoEmoji={settings.logoEmoji}
      logoType={settings.logoType}
      logoImage={settings.logoImage}
      uiTheme={settings.uiTheme}
    />
  );
}
