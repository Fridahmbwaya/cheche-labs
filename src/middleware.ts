import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Aspectus feature preview is an isolated learner experience.
// Do not expose legacy Cheche compliance demo routes on this branch.
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/login/") ||
      pathname === "/learn" || pathname.startsWith("/learn/") ||
      pathname === "/hr" || pathname.startsWith("/hr/")) {
    return NextResponse.redirect(new URL("/preview/aspectus-welcome.html", request.url));
  }

  let response = NextResponse.next({ request });
  if (!pathname.startsWith("/aspectus") || pathname.startsWith("/aspectus/auth/callback")) return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookies) {
        cookies.forEach(({name,value}) => request.cookies.set(name,value));
        response=NextResponse.next({request});
        cookies.forEach(({name,value,options}) => response.cookies.set(name,value,options));
      }
    }}
  );
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.redirect(new URL("/preview/aspectus-welcome.html",request.url));
  return response;
}
export const config = {
 matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
