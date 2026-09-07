"use client";

import { useState } from "react";
import { Mail, ChevronDown } from "lucide-react";
import WhatsappIcon from "@/components/WhatsappIcon";
import { t, type Locale } from "@/lib/i18n";

const emptyForm = { firstName: "", lastName: "", phone: "", country: "", email: "", subject: "", message: "" };

export default function ContactSection({
  contactEmail, contactWhatsapp, locale,
}: {
  contactEmail: string | null; contactWhatsapp: string | null; locale: Locale;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setForm(emptyForm);
      } else {
        setError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setError(t(locale, "server_unreachable_short"));
    } finally {
      setBusy(false);
    }
  }

  const whatsappHref = contactWhatsapp ? `https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, "")}` : null;
  const canSubmit = form.firstName && form.lastName && form.phone && form.country && form.email.includes("@") && form.subject && form.message;

  return (
    <div className="card">
      <strong>{t(locale, "contact_us_title")}</strong>

      {(contactEmail || contactWhatsapp) && (
        <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 12 }}>
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              aria-label={contactEmail}
              title={contactEmail}
              style={{ width: 40, height: 40, borderRadius: 999, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Mail size={19} color="var(--primary)" />
            </a>
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={contactWhatsapp || "WhatsApp"}
              title={contactWhatsapp || "WhatsApp"}
              style={{ width: 40, height: 40, borderRadius: 999, background: "var(--primary-10)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <WhatsappIcon size={19} />
            </a>
          )}
        </div>
      )}

      <button
        onClick={() => setFormOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, marginTop: 16, cursor: "pointer", textAlign: "left", color: "var(--primary)", fontWeight: 600, fontSize: 14 }}
      >
        {t(locale, "contact_form_toggle")}
        <ChevronDown size={18} style={{ transform: formOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {formOpen && (
        success ? (
          <p className="muted" style={{ marginTop: 12, color: "#2E7D53" }}>{t(locale, "contact_form_success")}</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{t(locale, "contact_form_desc")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label className="field">
                <span className="field-label">{t(locale, "field_first_name")}</span>
                <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{t(locale, "field_last_name")}</span>
                <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label className="field">
                <span className="field-label">{t(locale, "field_phone")}</span>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{t(locale, "field_country")}</span>
                <input value={form.country} onChange={(e) => update("country", e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">{t(locale, "field_email")}</span>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">{t(locale, "field_subject")}</span>
              <input value={form.subject} onChange={(e) => update("subject", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">{t(locale, "field_message")}</span>
              <textarea rows={3} value={form.message} onChange={(e) => update("message", e.target.value)} />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" disabled={busy || !canSubmit} onClick={submit}>
              {busy ? t(locale, "loading") : t(locale, "contact_form_submit")}
            </button>
          </div>
        )
      )}
    </div>
  );
}
