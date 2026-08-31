import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me";
const COOKIE_NAME = "transgest_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

export type SessionPayload =
  | { role: "OWNER" | "DRIVER"; userId: string; organizationId: string; phone: string }
  | { role: "PLATFORM_ADMIN"; userId: string; email: string };

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/** À utiliser dans les Server Components / Route Handlers (lecture du cookie courant). */
export function getSession(): SessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** À utiliser dans middleware.ts (l'API cookies() de next/headers n'y est pas disponible). */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
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
