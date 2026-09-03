/**
 * Client REST léger pour l'API PayPal Subscriptions. PayPal maintient des
 * SDK officiels, mais leur couverture des endpoints Subscriptions reste
 * incomplète — l'appel direct à l'API REST documentée est l'approche
 * recommandée par PayPal lui-même pour ce cas d'usage précis.
 */

function paypalBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants — PayPal n'est pas configuré.");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth : échec (HTTP ${res.status})`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/** Appel authentifié à l'API PayPal. Lève une erreur avec le détail PayPal en cas d'échec. */
export async function paypalFetch(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PayPal : ${data.message || res.statusText} (HTTP ${res.status})`);
  }
  return data;
}
