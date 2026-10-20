import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Delaware Rebid Radar",
    template: "%s · Delaware Rebid Radar",
  },
  description:
    "See which Delaware state contracts are likely to be rebid, and when, using open data from data.delaware.gov.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
