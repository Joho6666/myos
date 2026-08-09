import { NextResponse, type NextRequest } from "next/server";
import { getOwnerEmail } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session-token";

async function hasValidSession(request: NextRequest) {
  const payload = await verifySessionToken(request.cookies.get("myos_session")?.value);
  return Boolean(payload && payload.email === getOwnerEmail());
}

export async function middleware(request: NextRequest) {
  const isPrivate = request.nextUrl.pathname.startsWith("/app");
  const hasSession = await hasValidSession(request);

  if (isPrivate && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/app/:path*"]
};
