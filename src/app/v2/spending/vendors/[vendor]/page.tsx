import type { Metadata } from "next";
import { VendorSpending } from "@/components/spending/Spending";
import { parseYear } from "@/lib/spending";

export const metadata: Metadata = { title: "Where are you spending?" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ params, searchParams }: { params: Promise<{ vendor: string }>; searchParams: SP }) {
  const [{ vendor }, q] = await Promise.all([params, searchParams]);
  return <VendorSpending variant="v2" slug={vendor} year={parseYear(q.fy)} />;
}
