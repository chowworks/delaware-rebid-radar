import type { Metadata } from "next";
import { CategoriesSpending } from "@/components/spending/Spending";
import { parseYear } from "@/lib/spending";

export const metadata: Metadata = { title: "Small purchases by category" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  return <CategoriesSpending variant="classic" year={parseYear((await searchParams).fy)} small />;
}
