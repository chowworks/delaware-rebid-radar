import type { Metadata } from "next";
import Link from "next/link";
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
  const intro = (
    <>
      <nav className="text-[14px] text-ink-500">
        <Link href="/" className="hover:text-ink-900">Home</Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-400">Opportunities</span>
      </nav>
      <p className="eyebrow mt-4 text-ink-400">Delaware · Rebid radar</p>
      <h1 className="display mt-3 text-[48px] text-ink-900 sm:text-[58px]">Every state contract,<br />sorted by its next bid.</h1>
      <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-500">
        Each contract shows when its replacement is most likely to post, who holds it now, and how likely it is to come back.
        See <Link href="/methodology" className="text-de-600 hover:underline">how it works</Link>.
      </p>
    </>
  );
  return (
    <>
      {data.source === "sample" && <SampleBanner />}
      <Explorer contracts={data.contracts} initialQuery={q ?? ""} intro={intro} />
    </>
  );
}
