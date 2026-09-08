# Buffer and Bath Heat Planner

Version 5 of the calculator. A static Vite + React single-page tool for
buffer vessel / bath heat loss, exchanger duty, flow and heat-up (recovery)
time, with LPHW primary and chilled-water primary circuit modes. No server,
API keys or database; fonts are bundled locally and the app works offline via
a service worker once it has been opened online.

The source code lives in this repository (`src/`, `public/`, `index.html`).
The ready-built site GitHub Pages serves is in `docs/`.

## What is new in version 5

- Blue and white colour scheme matching the Enthalpy app (teal removed).
- Buffer / bath mode: results stay hidden until a tank construction has been
  chosen, then the live result, loss breakdown, flow check and heat-up appear.
- Duty and flow: enter exchanger duty (kW) and design ΔT (K); the flow is
  derived as q = P ÷ (ρ·cp·ΔT) in l/s and m³/h. An "override flow" toggle lets
  you enter a fixed circulation (e.g. a reheat case with fewer pumps running);
  the deliverable duty is then limited to q·ρ·cp·ΔT, both figures are shown
  and the flow-limited duty is used for the heat-up time.
- Heat-up time is shown both with standing losses (construction U-values,
  open-top losses, optional insulated pipework W/K) and with no losses. The
  loss basis can be overridden with a manual kW, a manual W/K or ignored.
  Losses are recalculated at every temperature step so the rate falls as the
  fluid warms.
- Advanced assumptions: propylene or ethylene glycol 0–30 % (5 % steps) sets
  density and specific heat from indicative published tables, with a manual
  override still available. 0 % reproduces the previous water defaults.
- Project reference (name, reference, client, engineer, date, notes) saved
  locally, and a "Report / PDF" view that prints cleanly (use "Save as PDF"
  in the browser print dialog) for all three modes.
- Input checks with warnings, derived values (areas, W/K, kWh/day, turnover),
  a per-mode reset and a plain-language results summary.

## Easiest: GitHub Pages (no build required)

1. In the repository, open Settings > Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Choose the main branch and the /docs folder, then save.
4. GitHub will show your website address when publishing finishes.

The docs folder is the complete ready-built website. Keep its index.html,
assets folder, icons, manifest and service worker together.

## Other static hosting

Upload the contents of `docs` to your hosting provider's public website folder.
No build command or server is needed when using these ready-built files.

## Edit and rebuild

Install Node.js 22.13 or later and pnpm, then run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Edit `src/App.tsx` for the calculator and `src/globals.css` for its appearance.
To create a new production build:

```sh
pnpm build
pnpm preview
```

The fresh website is written to `dist`. Replace the contents of `docs` with the
contents of `dist` (keeping `docs/.nojekyll`) and commit the updated `docs`
folder to publish your changes. Bump the cache name in `public/sw.js` so that
returning visitors pick up the new build. For a hosting service that builds
from your repository, use `pnpm build` as the build command and `dist` as the
output folder.

## Saved inputs and offline use

Inputs and project details are stored locally in the browser for each website
address (versions before 5 are migrated automatically on first load). No user
data is included in the repository. The app uses a service worker for offline
caching after online use; use HTTPS hosting (or localhost for development).
Opening index.html by double-clicking is not a supported way to run the app.

GitHub publishing reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
