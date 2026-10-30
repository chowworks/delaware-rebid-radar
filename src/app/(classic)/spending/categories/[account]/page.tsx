import type { Metadata } from "next";
import { CategorySpending } from "@/components/spending/Spending";
import { parseYear } from "@/lib/spending";

export const metadata: Metadata = { title: "All spending by category" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ params, searchParams }: { params: Promise<{ account: string }>; searchParams: SP }) {
  const [{ account }, q] = await Promise.all([params, searchParams]);
  const dept = typeof q.dept === "string" ? q.dept : undefined;
  return <CategorySpending variant="classic" account={account} year={parseYear(q.fy)} dept={dept} small={q.scope === "small"} />;
}
