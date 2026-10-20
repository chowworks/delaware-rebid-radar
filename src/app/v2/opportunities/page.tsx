import type { Metadata } from "next";
import Explorer from "@/components/v2/Explorer";
import { SampleBanner } from "@/components/v2/Badges";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, data] = await Promise.all([searchParams, getDataset()]);
  return (
    <>
      {data.source === "sample" && <SampleBanner />}
      <div className="wash border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6">
          <p className="eyebrow text-de-600">Contract opportunities</p>
          <h1 className="display mt-3 text-5xl text-ink-900 sm:text-6xl">Find your next rebid.</h1>
          <p className="mt-3 max-w-2xl text-ink-500">
            Current Delaware contracts, ordered by when a replacement solicitation is most likely to post.
            Windows are estimates from expiration dates; see <a href="/methodology" className="text-de-600 underline-offset-2 hover:underline">how it works</a>.
          </p>
        </div>
      </div>
      <div className="relative mx-auto -mt-9 max-w-7xl px-4 pb-16 sm:px-6">
        <Explorer contracts={data.contracts} initialQuery={q ?? ""} />
      </div>
    </>
  );
}
