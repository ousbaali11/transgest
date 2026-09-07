import { getLocale } from "@/lib/get-locale";
import { getPlatformSettings } from "@/lib/settings";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const locale = getLocale();
  const settings = await getPlatformSettings();
  return (
    <AdminLoginForm
      locale={locale}
      appName={settings.appName}
      logoEmoji={settings.logoEmoji}
      logoType={settings.logoType}
      logoImage={settings.logoImage}
    />
  );
}
