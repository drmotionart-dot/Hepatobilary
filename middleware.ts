import { NextRequest, NextResponse } from "next/server";

// Route gate: presence of the JWT cookie is checked here (cheap, edge-safe).
// Signature verification happens per-page via requireSession() in lib/api.ts.
export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ward/:path*",
    "/clinic/:path*",
    "/emergency/:path*",
    "/roster/:path*",
    "/admin/:path*",
    "/lab-import/:path*",
  ],
};
