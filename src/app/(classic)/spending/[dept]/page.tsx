import type { Metadata } from "next";
import { DepartmentSpending } from "@/components/spending/Spending";
import { parseYear } from "@/lib/spending";

export const metadata: Metadata = { title: "Where are you spending?" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ params, searchParams }: { params: Promise<{ dept: string }>; searchParams: SP }) {
  const [{ dept }, q] = await Promise.all([params, searchParams]);
  const division = typeof q.division === "string" ? q.division : undefined;
  return <DepartmentSpending variant="classic" slug={dept} year={parseYear(q.fy)} division={division} />;
}
