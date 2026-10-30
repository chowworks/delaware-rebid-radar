import { NextResponse, type NextRequest } from "next/server";
import { categoryVendors, parseYear } from "@/lib/spending";

// One category's top vendors, loaded when a visitor opens that category on
// the category tabs. ?scope=small limits it to small purchases.
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const branch = categoryVendors(q.get("account") ?? "", parseYear(q.get("fy") ?? undefined), q.get("scope") === "small");
  if (!branch) return NextResponse.json({ error: "unknown category" }, { status: 404 });
  return NextResponse.json(branch, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
