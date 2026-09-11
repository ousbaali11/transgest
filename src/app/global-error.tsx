"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeInfo, t, type Locale } from "@/lib/i18n";

/**
 * Écran de dernier recours (erreur non rattrapée dans le layout racine).
 * Il remplace tout le document, sans accès au serveur : la langue est
 * relue depuis le cookie côté navigateur pour rester cohérente avec le
 * reste du site plutôt que figée en français.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find((c) => c.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1];
      if (isLocale(raw)) setLocale(raw);
    } catch {
      // cookie illisible : on garde la langue par défaut
    }
  }, []);

  return (
    <html lang={locale} dir={localeInfo[locale].dir}>
      <body>
        <div className="container" style={{ textAlign: "center", marginTop: 100 }}>
          <span style={{ fontSize: 40 }}>⚠️</span>
          <h1 style={{ fontSize: 22, marginTop: 16, marginBottom: 8 }}>{t(locale, "error_occurred")}</h1>
          <p className="muted" style={{ marginBottom: 24 }}>{t(locale, "retry_later")}</p>
          <button className="btn" style={{ width: "auto", padding: "10px 24px" }} onClick={() => reset()}>
            {t(locale, "retry_action")}
          </button>
        </div>
      </body>
    </html>
  );
}
