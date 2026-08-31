import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

const OWNER_PATHS = ["/dashboard", "/trips", "/expenses", "/clients", "/factures", "/flotte", "/reglages", "/abonnement"];
const ADMIN_PATHS = ["/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = getSessionFromRequest(req);

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/trips/:path*", "/expenses/:path*", "/clients/:path*", "/factures/:path*", "/flotte/:path*", "/reglages/:path*", "/abonnement/:path*", "/admin/:path*"],
};
