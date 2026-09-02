import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// jose (et non jsonwebtoken) : jsonwebtoken s'appuie sur le module "crypto"
// de Node.js, qui n'est PAS disponible dans l'Edge Runtime utilisé par
// middleware.ts. jose utilise l'API Web Crypto, compatible Node ET Edge.
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me");
export const SESSION_COOKIE_NAME = "transgest_session";

// Connexion persistante façon WhatsApp : 400 jours est le maximum qu'un
// navigateur accepte pour un cookie (au-delà, Chrome/Safari l'ignorent).
// Combiné à la "session glissante" dans middleware.ts (qui prolonge le
// cookie à chaque visite), un utilisateur actif ne se reconnecte donc
// jamais tant qu'il ne se déconnecte pas lui-même.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export type SessionPayload =
  | { role: "OWNER"; userId: string; organizationId: string; email: string }
  | { role: "DRIVER"; userId: string; organizationId: string; driverId: string; driverName: string }
  | { role: "PLATFORM_ADMIN"; userId: string; email: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** À utiliser dans les Server Components / Route Handlers (lecture du cookie courant). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** À utiliser dans middleware.ts (l'API cookies() de next/headers n'y est pas disponible). */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}
