import { getPlatformSettings } from "@/lib/settings";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const settings = await getPlatformSettings();

  return (
    <LoginForm
      appName={settings.appName}
      logoEmoji={settings.logoEmoji}
      logoType={settings.logoType}
      logoImage={settings.logoImage}
    />
  );
}
