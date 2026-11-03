import { NextResponse, type NextRequest } from "next/server";
import { searchVendors } from "@/lib/spending";

// Vendor search: ?q=code differently returns the top matches by purchase spend.
export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  return NextResponse.json(searchVendors(q), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
