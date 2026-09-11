import Link from "next/link";
import { getPlatformSettings } from "@/lib/settings";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

export default async function NotFound() {
  const settings = await getPlatformSettings();
  const locale = getLocale();

  return (
    <div className="container" style={{ textAlign: "center", marginTop: 100 }}>
      <span style={{ fontSize: 40 }}>{settings.logoEmoji}</span>
      <h1 style={{ fontSize: 22, marginTop: 16, marginBottom: 8 }}>{t(locale, "not_found_title")}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>{t(locale, "not_found_desc")}</p>
      <Link href="/" className="btn" style={{ display: "inline-flex", width: "auto", padding: "10px 24px", textDecoration: "none" }}>
        {t(locale, "back_home")}
      </Link>
    </div>
  );
}
