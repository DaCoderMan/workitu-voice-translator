import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (
    req.nextUrl.pathname === "/password" ||
    req.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("bee_auth")?.value;
  if (authCookie !== process.env.BEE_AUTH_SECRET) {
    return NextResponse.redirect(new URL("/password", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
