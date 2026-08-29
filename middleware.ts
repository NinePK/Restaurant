import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { canAccessPermission, routePermissionMap } from "@/lib/permissions";

const PUBLIC_PATHS = [
  "/admin/login",
  "/t/",
  "/order/status/",
  "/api/auth/login",
  "/api/menu/public",
  "/api/orders/public",
  "/_next",
  "/favicon",
  "/uploads",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const nextWithHeaders = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Allow public paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return nextWithHeaders();

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) return NextResponse.redirect(new URL("/admin/login", request.url));

    const user = await verifyToken(token);

    if (!user) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    for (const [route, permission] of Object.entries(routePermissionMap)) {
      if (pathname.startsWith(route) && !canAccessPermission(user.role, user.permissions, permission)) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }

    // Attach user info to headers for server components
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", user.role);
    requestHeaders.set("x-user-username", user.username);
    requestHeaders.set("x-user-permissions", JSON.stringify(user.permissions || []));

    return nextWithHeaders();
  }

  return nextWithHeaders();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
