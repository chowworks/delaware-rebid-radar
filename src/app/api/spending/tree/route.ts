import { NextResponse, type NextRequest } from "next/server";
import { departmentDivisions, parseYear } from "@/lib/spending";

// Divisions and their top vendors for one department, loaded when a visitor
// opens that department on /spending.
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const divisions = departmentDivisions(q.get("dept") ?? "", parseYear(q.get("fy") ?? undefined));
  if (!divisions) return NextResponse.json({ error: "unknown department" }, { status: 404 });
  return NextResponse.json(divisions, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
