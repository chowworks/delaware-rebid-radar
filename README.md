# Delaware Rebid Radar

Predicts when Delaware state contracts are likely to be re-solicited, so small and diverse
businesses can prepare (and get OSD certified) before the bid posts.

Built on open data from [data.delaware.gov](https://data.delaware.gov/):

| Dataset | ID | Used for |
| --- | --- | --- |
| Current Contracts | `xxed-9nm8` | Contracts, agency, UNSPSC, effective/expiration dates, set-aside and MBE/WBE flags |
| Archived Contracts | `ey64-me86` | Detecting recurring needs (earlier awards with the same suffix or a similar title) |
| Awarded Vendor Contact Info | `h9bb-iyu6` | Incumbent vendors and their OSD / veteran / Delaware status |

## How predictions work

`src/lib/predict.ts`:

- **Window**: expiration date minus a category lead time (9 months for complex services/IT,
  4 for construction, fuel and food, 6 otherwise), ±2 months, capped at expiration.
- **Likelihood**: High if an earlier matching award exists in the archive; Low for one-off
  projects, cooperative/GSA contracts, and umbrella agreements with very long terms; Medium otherwise.

### Known limits

- Renewal options are not in the open data (`extensionavailable` is almost always empty), so an
  extension makes the real rebid later than shown.
- No contract values for most contracts.
- Lead times are assumptions, not measured. Next step: compare archived expiration dates against
  the effective dates of their successors to calibrate them.

## Develop

```bash
npm install
npm run dev                  # live data
USE_SAMPLE_DATA=1 npm run dev  # offline, built-in 60-contract sample
npm run check                # print prediction summary (sample)
npm run check:live           # same against live data
```

Live data is fetched server-side and cached for 24 hours (ISR). If the API is unreachable the
app falls back to the sample and shows a banner.

## Deploy (Vercel)

1. Import this repo in Vercel (framework preset: Next.js, no build settings to change).
2. Optional: set `SOCRATA_APP_TOKEN` to raise API rate limits.
3. Deploy.
