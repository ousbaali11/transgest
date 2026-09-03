import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const settings = await getPlatformSettings();
  const locale = getLocale();

  return (
    <LoginForm
      appName={settings.appName}
      logoEmoji={settings.logoEmoji}
      logoType={settings.logoType}
      logoImage={settings.logoImage}
      locale={locale}
    />
  );
}
