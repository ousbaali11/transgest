import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// jose (et non jsonwebtoken) : jsonwebtoken s'appuie sur le module "crypto"
// de Node.js, qui n'est PAS disponible dans l'Edge Runtime utilisé par
// middleware.ts. jose utilise l'API Web Crypto, compatible Node ET Edge.
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me");
const COOKIE_NAME = "transgest_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

export type SessionPayload =
  | { role: "OWNER" | "DRIVER"; userId: string; organizationId: string; phone: string }
  | { role: "PLATFORM_ADMIN"; userId: string; email: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS)
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
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** À utiliser dans middleware.ts (l'API cookies() de next/headers n'y est pas disponible). */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
