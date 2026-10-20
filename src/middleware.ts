import { NextResponse, type NextRequest } from "next/server";

// Two designs share one app. ?design=2 switches a visitor to the redesign in
// src/app/v2 and remembers it in a cookie; ?design=1 switches back. URLs stay
// the same either way: v2 pages are served by rewriting /x to /v2/x.
const COOKIE = "design";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const param = searchParams.get("design");
  const design = param === "1" || param === "2" ? param : req.cookies.get(COOKIE)?.value;

  // Keep /v2 itself as an internal path.
  if (pathname === "/v2" || pathname.startsWith("/v2/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    url.searchParams.set("design", "2");
    return NextResponse.redirect(url);
  }

  const res =
    design === "2"
      ? NextResponse.rewrite(new URL(`/v2${pathname === "/" ? "" : pathname}${req.nextUrl.search}`, req.url))
      : NextResponse.next();
  if (param === "2") res.cookies.set(COOKIE, "2", { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  if (param === "1") res.cookies.delete(COOKIE);
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
