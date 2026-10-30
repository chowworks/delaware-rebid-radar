# Delaware Rebid Radar

Predicts when Delaware state contracts are likely to be re-solicited, so small and diverse
businesses can prepare (and get OSD certified) before the bid posts.

Built on open data from [data.delaware.gov](https://data.delaware.gov/):

| Dataset | ID | Used for |
| --- | --- | --- |
| Current Contracts | `xxed-9nm8` | Contracts, agency, UNSPSC, effective/expiration dates, set-aside and MBE/WBE flags |
| Archived Contracts | `ey64-me86` | Detecting recurring needs (earlier awards with the same suffix or a similar title) |
| Awarded Vendor Contact Info | `h9bb-iyu6` | Incumbent vendors and their OSD / veteran / Delaware status |
| Open / Recently Closed / Not Awarded Bids | `2hnj-zwix`, `yhim-4378`, `bnup-azrk` | Real solicitation dates, used to measure lead times |

## How predictions work

`src/lib/predict.ts`:

- **Window**: expiration date minus the measured lead time for the contract's UNSPSC segment.
  The window is the middle half (25th to 75th percentile) of past lead times; "most likely" is
  the median. Lead times live in `src/data/lead-times.json`, produced by `npm run calibrate`,
  which matches past bids to the contracts they replaced (same agency, plus same number suffix
  or near-identical title). Segments with fewer than 8 matched bids use the overall figures
  (median 5 months, middle half 3 to 11 months, from 278 matched bids as of 2026-10-20).
- **Likelihood**: High if an earlier matching award exists in the archive; Low for one-off
  projects, cooperative/GSA contracts, and umbrella agreements with very long terms; Medium otherwise.

### Known limits

- Renewal options are not in the open data (`extensionavailable` is almost always empty), so an
  extension makes the real rebid later than shown.
- No contract values for most contracts.
- Lead times are measured but noisy: 278 matched bids, most of them from the Not Awarded dataset
  (awarded bids are not published on their own), and matching is by title. Windows are wide
  (about 8 months on average) because real lead times vary that much.

## Develop

```bash
npm install
npm run dev                  # live data
USE_SAMPLE_DATA=1 npm run dev  # offline, built-in 60-contract sample
npm run check                # print prediction summary (sample)
npm run check:live           # same against live data
npm run calibrate            # re-measure lead times from live bid data
```

Live data is fetched server-side and cached for 24 hours (ISR). A Vercel Cron job hits
`/api/refresh` daily at 10:00 UTC (6am Eastern) to purge that cache and rebuild the home pages,
so the site stays current even when nobody visits. If the API is unreachable the app falls back
to the sample and shows a banner.

## Deploy (Vercel)

1. Import this repo in Vercel (framework preset: Next.js, no build settings to change).
2. Set `CRON_SECRET` to any long random string. Vercel sends it with the daily refresh, and
   `/api/refresh` rejects requests without it.
3. Optional: set `SOCRATA_APP_TOKEN` to raise API rate limits.
4. Deploy.

## Designs

Two designs ship in the same app. The original is the default. Add `?design=2` to any URL to
switch to option 2 (inspired by samsearch.co); a cookie keeps it for later visits, and
`?design=1` switches back. `src/middleware.ts` rewrites requests to `src/app/v2` when option 2
is on, so URLs stay the same. Both designs share the search and filter logic in
`src/components/useExplorer.ts`.
