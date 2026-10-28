// Next.js 16: keep this file name and the `proxy` export.
// Next.js 15: rename the file to middleware.ts and the function to `middleware`.
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken, type UserRole } from "@/lib/auth/jwt";

const PORTALS: Record<string, { role: UserRole; login: string }> = {
  "/patient": { role: "patient", login: "/login" },
  "/doctor": { role: "doctor", login: "/doctor/login" },
  "/admin": { role: "admin", login: "/admin/login" },
};

const HOME: Record<UserRole, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const prefix = Object.keys(PORTALS).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!prefix) return NextResponse.next();

  const portal = PORTALS[prefix];

  // The login page lives inside the portal's URL space but must stay public
  if (pathname === portal.login || pathname.startsWith(`${portal.login}/`)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const url = new URL(portal.login, req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (session.role !== portal.role) {
    return NextResponse.redirect(new URL(HOME[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/doctor/:path*", "/admin/:path*"],
};
