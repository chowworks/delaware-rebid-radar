import type { Metadata } from "next";
import { SpendingHome } from "@/components/spending/Spending";
import { parseYear } from "@/lib/spending";

export const metadata: Metadata = { title: "Where are you spending?" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  return <SpendingHome variant="v2" year={parseYear((await searchParams).fy)} />;
}
