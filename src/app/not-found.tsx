import Link from "next/link";
import { getPlatformSettings } from "@/lib/settings";

export default async function NotFound() {
  const settings = await getPlatformSettings();

  return (
    <div className="container" style={{ textAlign: "center", marginTop: 100 }}>
      <span style={{ fontSize: 40 }}>{settings.logoEmoji}</span>
      <h1 style={{ fontSize: 22, marginTop: 16, marginBottom: 8 }}>Page introuvable</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Cette page n&apos;existe pas ou plus.
      </p>
      <Link href="/" className="btn" style={{ display: "inline-flex", width: "auto", padding: "10px 24px", textDecoration: "none" }}>
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
