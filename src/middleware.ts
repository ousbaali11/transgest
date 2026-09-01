import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const OWNER_PATHS = ["/dashboard", "/trips", "/expenses", "/clients", "/factures", "/flotte", "/reglages", "/abonnement"];
const ADMIN_PATHS = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && pathname !== "/admin/login") {
    if (!session || session.role !== "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (OWNER_PATHS.some((p) => pathname.startsWith(p))) {
    if (!session || (session.role !== "OWNER" && session.role !== "DRIVER")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  const res = NextResponse.next();

  // Session glissante, façon WhatsApp : à chaque page visitée avec une
  // session valide, on réémet le cookie avec une nouvelle durée complète.
  // Résultat : un utilisateur qui rouvre l'app de temps en temps ne se
  // déconnecte jamais tout seul — seule une déconnexion manuelle le fait.
  if (session) {
    const fresh = await signSession(session);
    res.cookies.set(SESSION_COOKIE_NAME, fresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/trips/:path*", "/expenses/:path*", "/clients/:path*", "/factures/:path*", "/flotte/:path*", "/reglages/:path*", "/abonnement/:path*", "/admin/:path*"],
};
