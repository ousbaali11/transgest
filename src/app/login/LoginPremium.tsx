"use client";

import {
  Route, TrendingUp, Receipt, Download, Users, Smartphone, Bell, Building2,
  ShieldCheck, KeyRound, Mail, Truck, BarChart3, ArrowLeft, UserRound,
} from "lucide-react";
import { formatAccessCode } from "@/lib/access-code";
import { t, type Locale, type TKey } from "@/lib/i18n";
import LandingHeader from "@/components/LandingHeader";
import { useLoginFlow } from "./useLoginFlow";

/**
 * Page d'accueil / connexion de l'interface "Premium" — structurée comme un
 * vrai site vitrine : accroche + deux entrées (propriétaire / chauffeur),
 * bandeau de confiance, fonctionnalités, "comment ça marche", pour qui,
 * appel final. La connexion elle-même (useLoginFlow) est strictement la
 * même que dans LoginForm.tsx : mêmes appels API, mêmes étapes.
 */
type Icon = typeof Route;
const FEATURES: { icon: Icon; title: TKey; desc: TKey }[] = [
  { icon: Route, title: "landing_feature_trips", desc: "pl_feat_trips_desc" },
  { icon: TrendingUp, title: "landing_feature_profit", desc: "pl_feat_profit_desc" },
  { icon: Receipt, title: "landing_feature_invoices", desc: "pl_feat_invoices_desc" },
  { icon: Download, title: "landing_feature_export", desc: "pl_feat_export_desc" },
  { icon: Users, title: "landing_feature_drivers", desc: "pl_feat_drivers_desc" },
  { icon: Bell, title: "pl_feat_docs_title", desc: "pl_feat_docs_desc" },
  { icon: Building2, title: "pl_feat_clients_title", desc: "pl_feat_clients_desc" },
  { icon: Smartphone, title: "landing_feature_devices", desc: "pl_feat_devices_desc" },
];
const STEPS: { icon: Icon; title: TKey; desc: TKey }[] = [
  { icon: Mail, title: "pl_step1_title", desc: "pl_step1_desc" },
  { icon: Truck, title: "pl_step2_title", desc: "pl_step2_desc" },
  { icon: BarChart3, title: "pl_step3_title", desc: "pl_step3_desc" },
];

export default function LoginPremium({ appName, logoEmoji, logoType, logoImage, locale }: { appName: string; logoEmoji: string; logoType: string; logoImage: string | null; locale: Locale }) {
  const {
    role, setRole, ownerStep, email, setEmail, emailCode, setEmailCode, devCode, driverCode, setDriverCode,
    error, busy, goHome, sendEmailCode, verifyEmailCode, editEmail, driverLogin,
  } = useLoginFlow(locale);
  const tr = (key: TKey) => t(locale, key);

  return (
    <div className="app-premium" style={{ minHeight: "100vh" }}>
      <LandingHeader appName={appName} logoEmoji={logoEmoji} logoType={logoType} logoImage={logoImage} locale={locale} uiTheme="premium" onHome={goHome} />

      {role === "select" ? (
        <div className="pm-landing">
          <section className="pm-hero">
            <span className="pm-kicker">{tr("app_tagline")}</span>
            <h1>{tr("landing_headline")}</h1>
            <p>{tr("landing_subheadline")}</p>
            <div className="pm-cta-row">
              <button className="btn" onClick={() => setRole("owner")}>{tr("pl_cta_owner")}</button>
              <button className="btn btn-ghost" onClick={() => setRole("driver")}>{tr("pl_cta_driver")}</button>
            </div>
            <div className="pm-trust">
              <div className="pm-trust-item"><ShieldCheck size={18} /> <span>{tr("pl_trust_no_install")}</span></div>
              <div className="pm-trust-item"><Smartphone size={18} /> <span>{tr("pl_trust_devices")}</span></div>
              <div className="pm-trust-item"><KeyRound size={18} /> <span>{tr("pl_trust_secure")}</span></div>
            </div>
          </section>

          <section className="pm-section">
            <div className="pm-section-head">
              <h2>{tr("pl_features_title")}</h2>
              <p>{tr("pl_features_desc")}</p>
            </div>
            <div className="pm-feature-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="pm-feature">
                  <div className="pm-feature-icon"><f.icon size={18} /></div>
                  <h3>{tr(f.title)}</h3>
                  <p>{tr(f.desc)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pm-section">
            <div className="pm-section-head">
              <h2>{tr("pl_how_title")}</h2>
            </div>
            <div className="pm-steps">
              {STEPS.map((s, i) => (
                <div key={s.title} className="pm-step">
                  <span className="pm-step-num">{i + 1}</span>
                  <h3>{tr(s.title)}</h3>
                  <p>{tr(s.desc)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pm-section">
            <div className="pm-audience">
              <div className="pm-audience-card">
                <h3><Building2 size={18} /> {tr("pl_for_owner_title")}</h3>
                <p>{tr("pl_for_owner_desc")}</p>
                <button className="btn" onClick={() => setRole("owner")}>{tr("login_owner")}</button>
              </div>
              <div className="pm-audience-card">
                <h3><UserRound size={18} /> {tr("pl_for_driver_title")}</h3>
                <p>{tr("pl_for_driver_desc")}</p>
                <button className="btn btn-ghost" onClick={() => setRole("driver")}>{tr("login_driver")}</button>
              </div>
            </div>
          </section>

          <section className="pm-final">
            <h2>{tr("pl_final_title")}</h2>
            <p>{tr("pl_final_desc")}</p>
            <button className="btn" onClick={() => setRole("owner")}>{tr("pl_cta_owner")}</button>
          </section>

          <footer className="pm-footer">
            <span>{appName} — {tr("app_description")}</span>
            <a href="/admin/login">{tr("login_admin_area")}</a>
          </footer>
        </div>
      ) : (
        <div className="pm-login-wrap" style={{ padding: "0 16px 48px" }}>
          <div className="pm-login-card">
            <button type="button" className="pm-back-link" onClick={goHome}>
              <ArrowLeft size={14} style={{ transform: "var(--back-arrow-flip, none)" }} /> {tr("back")}
            </button>
            <h1>{role === "owner" ? tr("pl_login_title_owner") : tr("pl_login_title_driver")}</h1>
            <p className="pm-hint">{role === "owner" ? tr("pl_login_owner_hint") : tr("login_driver_hint")}</p>

            {role === "owner" && ownerStep === "email" && (
              <>
                <label className="field">
                  <span className="field-label">{tr("login_email")}</span>
                  <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
                </label>
                {error && <p className="error-text">{error}</p>}
                <button className="btn" onClick={sendEmailCode} disabled={busy || !email}>{busy ? tr("loading") : tr("login_receive_code")}</button>
              </>
            )}

            {role === "owner" && ownerStep === "code" && (
              <>
                <p className="muted" style={{ marginBottom: 10 }}>
                  {tr("code_sent_to")} {email}.{" "}
                  <button type="button" onClick={editEmail} className="pm-inline-link">{tr("edit")}</button>
                </p>
                {devCode && (
                  <div className="card" style={{ background: "var(--primary-10)", border: "none" }}>
                    <span style={{ fontSize: 13 }}>{tr("dev_mode_code")} </span>
                    <strong>{devCode}</strong>
                  </div>
                )}
                <label className="field">
                  <span className="field-label">{tr("verification_code")}</span>
                  <input type="tel" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="0000" />
                </label>
                {error && <p className="error-text">{error}</p>}
                <button className="btn" onClick={verifyEmailCode} disabled={busy || emailCode.length < 4}>{busy ? tr("loading") : tr("login_verify")}</button>
                <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={sendEmailCode} disabled={busy}>{tr("login_resend")}</button>
              </>
            )}

            {role === "driver" && (
              <>
                <label className="field">
                  <span className="field-label">{tr("login_driver_code")}</span>
                  <input
                    type="text"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="off"
                    value={driverCode}
                    onChange={(e) => setDriverCode(formatAccessCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)))}
                    placeholder="Ab3D 5fG8"
                    style={{ letterSpacing: 2, fontSize: 18, textAlign: "center" }}
                  />
                </label>
                {error && <p className="error-text">{error}</p>}
                <button className="btn" onClick={driverLogin} disabled={busy || driverCode.replace(/\s+/g, "").length !== 8}>
                  {busy ? tr("loading") : tr("login_connect")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
