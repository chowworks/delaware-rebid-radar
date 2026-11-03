import { ImageResponse } from "next/og";

// The link-preview image (Open Graph; X/Twitter falls back to it). Next serves it for every
// page and adds the og:image / twitter:image tags. Colors follow the default design.
export const alt = "Delaware Rebid Radar: state contract opportunities for small and diverse businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0b2545";
const BUFF = "#d8b98a";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: NAVY, color: "white", fontFamily: "sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <svg width="96" height="96" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill={BUFF} />
              <path d="M9 23V9h6.2c4.4 0 7.3 2.7 7.3 7s-2.9 7-7.3 7H9Z" fill={NAVY} />
              <circle cx="15.3" cy="16" r="2.4" fill={BUFF} />
            </svg>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>Delaware Rebid Radar</div>
          </div>
          <div style={{ marginTop: 40, fontSize: 38, lineHeight: 1.35, color: "#e3eaf4", maxWidth: 980 }}>
            See which state contracts are likely to be rebid, and when, plus where agencies spend without a bid.
          </div>
          <div style={{ marginTop: 36, fontSize: 26, color: BUFF }}>For small &amp; diverse businesses · Open data from data.delaware.gov</div>
        </div>
        <div style={{ height: 16, background: BUFF }} />
      </div>
    ),
    size,
  );
}
