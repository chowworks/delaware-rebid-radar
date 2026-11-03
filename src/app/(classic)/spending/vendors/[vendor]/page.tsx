import type { Metadata } from "next";
import { VendorSpending } from "@/components/spending/Spending";
import { parseYear, vendorName } from "@/lib/spending";
import { alt, size } from "@/app/opengraph-image";

export async function generateMetadata({ params }: { params: Promise<{ vendor: string }> }): Promise<Metadata> {
  const name = vendorName((await params).vendor);
  if (!name) return { title: "Where are you spending?" };
  const description = `What Delaware state departments paid ${name}, and how much of it was small purchases made without a bid.`;
  // Setting openGraph/twitter replaces the inherited objects, so name the site preview image again.
  const images = [{ url: "/opengraph-image", alt, ...size }];
  return {
    title: name,
    description,
    openGraph: { title: name, description, images },
    twitter: { card: "summary_large_image", title: name, description, images },
  };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ params, searchParams }: { params: Promise<{ vendor: string }>; searchParams: SP }) {
  const [{ vendor }, q] = await Promise.all([params, searchParams]);
  return <VendorSpending variant="classic" slug={vendor} year={parseYear(q.fy)} />;
}
