# Bense (本色): box dye truth

A mobile-first PWA for the Perfect Corp YouCam API hackathon. It has two features, which work independently:

1. **Hair colour prediction.** It compares what a dye box promises with what your hair will probably do:
   - your starting level is measured from the hair in your selfie: YouCam Hair Color marks the hair, the device takes its median lightness, and an optional white card corrects the light;
   - YouCam Facial Color Tones adds the colour family as a cross-check, and you confirm the level;
   - a deterministic rules engine predicts the result;
   - YouCam Hair Color renders both looks on your photo;
   - you get a better option or a recommendation to see a professional.
2. **Hair analysis.** YouCam Hair Type, Frizziness, Length and Density build a hair profile with general care tips. The profile adds context to the dye result but never changes the prediction or the safety checks.

Demo mode (`/demo`) shows three colour scenarios and a hair-profile example without photos or an API key. Every result is labelled live, calculated by rules, demo example, or not available.

## Run it locally

Requirements: Node 22+ and npm. The browser tests use an installed Edge or Chrome.

```sh
cd app
npm install
cp .env.example .env     # then set YOUCAM_API_KEY
npm run dev              # web on http://localhost:5173, API on http://localhost:8787
```

Open http://localhost:5173. For a phone on the same network, camera access needs HTTPS. Over plain HTTP, the app offers photo upload instead.

### Environment variables (backend only)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `YOUCAM_API_KEY` | For live features | none | YouCam API key. Without it, live calls answer "not set up" and demo mode still works. |
| `YOUCAM_API_BASE` | No | `https://yce-api-01.makeupar.com` | |
| `PORT` | No | `8787` | API port; Vite proxies `/api` to it. |

The key is read only by the server, from `app/.env` (falling back to `../.env`). Never prefix it with `VITE_`. `.env` files are git-ignored.

### Commands

A live colour reading costs 21 units: Facial Color Tones 20, plus 1 for the hair mask. The reveal costs 2 more.

| Command | What it does |
|---|---|
| `npm run dev` | Web and API in watch mode |
| `npm run build` / `npm run preview` | Production build and local preview |
| `npm run typecheck` · `npm run lint` | TypeScript and ESLint |
| `npm test` | Unit and backend tests (mocked YouCam, no units used) |
| `npm run test:e2e` | Browser tests at 393 px (API mocked in the page, no units used) |
| `npm run test:pwa` | Builds, then checks the manifest, installability, service worker, caching and offline mode |
| `npm run smoke:tones -- <photo>` | **Live**: Facial Color Tones (20 units) |
| `npm run smoke:level -- <photo> … [--card x,y] [--reuse]` | **Live**: hair level measurement (1 unit per photo; `--reuse` re-measures a saved render for free) |
| `npm run smoke:reveal -- <photo> --start 4 --shade dev-9-1-very-light-ash-blonde --lift 2` | **Live**: two Hair Color renders (2 units) |
| `npm run smoke:hair -- --front f.jpg --left l.jpg --right r.jpg --top t.jpg [--record "…"]` | **Live**: hair analysis (up to 7 units). `--record` saves the results as the demo profile. |
| `npm run smoke:walkthrough -- --selfie s.jpg --front … [--only colour\|analysis]` | **Live**: both journeys through the real UI at 393 px, with screenshots |

## YouCam integration status (verified 2026-10-15)

| Capability | Status | Evidence |
|---|---|---|
| File upload | Live, verified | Every live run |
| Facial Color Tones | Live, verified | Browser walkthrough: 9.5 s. It returns a colour *family* only (it said Auburn for blonde and dark-brown samples), so it's a cross-check, not the level. |
| Hair level measurement (Hair Color `#00FF00` mask + on-device L*) | Live, verified | Docs blonde sample: L* 58.5, level 8, the same value from two renders hours apart. Dark base: L* 23.4, level 3. In the browser, the colour reading, mask and measurement took 12.3 s in parallel. Matches `tests/boxtruth.py` exactly on the recorded pair. |
| Hair Color | Live, verified | Browser walkthrough: two parallel renders in 12.1 s. It only partly lightens dark hair; see `docs/youcam-api/README.md`. |
| Hair Length | Live, verified | "above chest or longer" on a docs sample photo, through the browser |
| Hair Density | Live, verified | "Low Density", score 0.92, on the docs density sample (matches the docs' label). Intermittent `unknown_internal_error`, retried once automatically. |
| Hair Type | **Not verified live** | Only the error path (`error_face_angle_invalid`). There's no usable three-angle sample yet. |
| Hair Frizziness | **Not verified live** | Same as Hair Type |

## Demo for judges (about 3 minutes)

1. Open the dashboard and tap **Demo mode**, then **Start the walkthrough** (scenario A, "The brass surprise").
2. **Starting colour:** natural level 4. Tap + or − to show that confirming a level re-runs the same engine. Live, the level is measured from the selfie, and tapping the white card calibrates it.
3. **Box shade:** 9.1 Very light ash blonde.
4. **Promise vs prediction:** two real YouCam Hair Color renders of a sample photo, labelled as a demo example.
5. **The gap:** "Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short", with the reasons.
6. **Better option:** see a professional, or the closest box shades the same rules expect to work.
7. Optionally, **Next** to scenario B (dye can't lift dye) and scenario C (green-tone risk).
8. **Hair analysis example:** recorded YouCam results (Length and Density measured; Type and Frizz show YouCam's real rejection) with care tips.
9. **Live:** from the dashboard, tap **Try a box dye** with a selfie, or **Hair profile** with four guided photos. If a live call fails, the app explains why and offers a retry. A labelled demo example is offered only as a separate, explicit choice.

## Known limitations

- The prediction rules come from brand and colourist guidance, and they are not validated. The lift assumption defaults to 1 level and can be changed in Settings.
- Shades come in two sets:
  - **Example shades** (`dev-*`, 43) are illustrative.
  - **Real products** (`shared/catalogue/shades.brands.json`, 202) are L'Oréal Paris and Garnier shades for India and the USA, read from the brands' own websites on 2026-10-16. Regenerate them with `npx tsx server/scripts/import-brand-shades.ts <lists…>`.
    - Shade codes and names are the brands' own.
    - Level and tone are read from the code. Only Garnier USA's number guide explains its codes; for the other brands the level is the code's first number, the usual convention.
    - Swatch colours are our model, not the brands' colours.
    - Shades with no whole level are left out: Féria, Nutrisse Ultra Color letter codes and ½ levels. So are lightening and bleach kits.
    - Semi- and demi-permanent shades are predicted not to lighten.
    - L'Oréal Paris and Garnier are trademarks of their owners, and Bense isn't affiliated with them. Keep their boxes and logos out of the demo video.
- The level comes from the hair's median CIE L* mapped with the shade model's bands (L* = 12 + 7 × (level − 1)). These bands are **not calibrated** against salon-graded photos.
  - Without the white card, light and exposure can shift the result by about a level, and the app says so.
  - Very dark or tightly curled hair reads darker because of shadows between strands (a docs curly-hair sample measured L* 8.4, level 1).
  - The user always confirms the level.
  - Fitting the bands needs about 10–20 selfies with known levels; `npm run smoke:level` is ready for that.
- Facial Color Tones can't give a hair level; it's shown only as a colour-family cross-check.
- Hair Color can't fully lighten dark hair in a render, so the level numbers carry the gap.
- The demo render pair uses a synthetic dark-hair base (the docs sample recoloured with Hair Color). Scenarios B and C have no genuine sample photo, so they show model swatches only.
- Hair Type and Frizz are not verified live, and the demo hair profile combines photos of two different people from the docs, as its label says.
- Photos aren't measurements of porosity, strand thickness, scalp health or damage. Nothing here is medical advice, and the safety questions can't make a dye safe.
- Data lives in the browser session: photos are kept in memory only, and choices in `sessionStorage`. There are no accounts and no database. This is a local demo, not a production deployment.
