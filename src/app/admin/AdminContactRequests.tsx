import { t, dateLocale, type Locale } from "@/lib/i18n";
import CollapsibleCard from "@/components/CollapsibleCard";

type ContactRequest = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

export default function AdminContactRequests({ requests, locale }: { requests: ContactRequest[]; locale: Locale }) {
  return (
    <CollapsibleCard title={`${t(locale, "admin_contact_requests_title")} (${requests.length})`}>
      {requests.length === 0 ? (
        <p className="muted">{t(locale, "admin_contact_requests_empty")}</p>
      ) : (
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {requests.map((r) => (
            <div key={r.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{r.firstName} {r.lastName}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString(dateLocale(locale))}</span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{r.country} · {r.phone} · {r.email}</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6 }}>{r.subject}</div>
              <p style={{ fontSize: 13, marginTop: 2, whiteSpace: "pre-wrap" }}>{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
