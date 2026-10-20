import type { Metadata } from "next";
import Explorer from "@/components/Explorer";
import { SampleBanner } from "@/components/Badges";
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Contract opportunities</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Current Delaware contracts, ordered by when a replacement solicitation is most likely to post.
            Windows are estimates from expiration dates; see <a href="/methodology" className="underline">how it works</a>.
          </p>
        </div>
        <Explorer contracts={data.contracts} initialQuery={q ?? ""} />
      </div>
    </>
  );
}
