import { NextResponse } from "next/server";
import { sizedVendors } from "@/lib/spending";

// The searchable large/small business list, loaded when its dialog opens.
export function GET() {
  return NextResponse.json(sizedVendors(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
