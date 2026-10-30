import { revalidatePath, revalidateTag } from "next/cache";
import { DATA_TAG } from "@/lib/data";

// Called daily by Vercel Cron (vercel.json). Without it, cached pages only
// rebuild when someone visits after the 24-hour window, so a quiet week leaves
// the site showing old data until the first visitor of the day.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel sends "Bearer $CRON_SECRET" on cron requests. Refuse everything else
  // so the route can't be used to hammer data.delaware.gov.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  revalidateTag(DATA_TAG);
  revalidatePath("/", "layout");

  // Warm both home pages so the next visitor gets fresh data without waiting.
  // The host comes from Vercel's own env, never the request, so a forged Host
  // header can't point these fetches elsewhere.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const warmed = host
    ? await Promise.all(
        ["/", "/?design=2"].map((path) =>
          fetch(`https://${host}${path}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) })
            .then((res) => res.status)
            .catch(() => null),
        ),
      )
    : [];

  return Response.json({ revalidated: true, warmed, at: new Date().toISOString() });
}
