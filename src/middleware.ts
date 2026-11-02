import { NextResponse, type NextRequest } from "next/server";

// Aspectus preview: never route into the unrelated Cheche compliance demo.
// Authentication for /aspectus is handled by the established browser-side flow.
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/login/") ||
      pathname === "/learn" || pathname.startsWith("/learn/") ||
      pathname === "/hr" || pathname.startsWith("/hr/")) {
    return NextResponse.redirect(new URL("/preview/aspectus-welcome.html", request.url));
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/", "/login/:path*", "/learn/:path*", "/hr/:path*"],
};
