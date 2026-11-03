import type { Metadata } from "next";
import "./globals.css";

const SITE_NAME = "Delaware Rebid Radar";
const DESCRIPTION =
  "See which Delaware state contracts are likely to be rebid, and when, using open data from data.delaware.gov.";

// Absolute URLs for link previews: production domain on Vercel, else localhost.
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = host ? `https://${host}` : `http://localhost:${process.env.PORT ?? 3000}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
