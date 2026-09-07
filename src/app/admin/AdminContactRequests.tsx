"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

export default function AdminContactRequests({ requests: initialRequests, locale }: { requests: ContactRequest[]; locale: Locale }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string) {
    if (!confirm(t(locale, "admin_delete_request_confirm"))) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/contact-requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRequests(requests.filter((r) => r.id !== id));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t(locale, "error_generic"));
      }
    } catch {
      setError(t(locale, "server_unreachable_short"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <CollapsibleCard title={`${t(locale, "admin_contact_requests_title")} (${requests.length})`}>
      {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}
      {requests.length === 0 ? (
        <p className="muted">{t(locale, "admin_contact_requests_empty")}</p>
      ) : (
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {requests.map((r) => (
            <div key={r.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong>{r.firstName} {r.lastName}</strong>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString(dateLocale(locale))}</span>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busyId === r.id}
                    aria-label={t(locale, "delete")}
                    title={t(locale, "delete")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}
                  >
                    <Trash2 size={15} color="#C0392B" />
                  </button>
                </div>
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
