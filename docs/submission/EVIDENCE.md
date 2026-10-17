# Evidence: every number we use, and where it comes from

Rule: a number goes on a judged surface (Devpost text, video, gallery) only if it is in this file with a source.
Checked 2026-10-16. Quality labels: **DATA** (government, peer-reviewed, independent research), **BRAND** (survey paid for by a hair or beauty company), **MARKET** (analyst report summary), **NEWS**, **WEAK** (blog or booking-site data), **OURS** (measured or computed by Bense).

## Numbers used in the submission

| # | Number | Label | Source | Used in |
|---|---|---|---|---|
| 1 | Between 50% and 80% of women in the US, Japan and the EU have used hair dye | DATA | US National Cancer Institute, "Hair Dyes and Cancer Risk" (reviewed Dec 2022). https://www.cancer.gov/about-cancer/causes-prevention/risk/myths/hair-dyes-fact-sheet | Story |
| 2 | 53% of UK women coloured their hair at home (2017) | DATA | Mintel, 2 May 2018, 2,000 adults. https://www.mintel.com/press-centre/beauty-and-personal-care/brits-prefer-blondes-blonde-is-the-nations-number-one-dyed-hair-colour-of-choice | Story |
| 3 | "Up to 70% of at-home color users are unsure which shade suits them" | BRAND (L'Oréal's own GM, 2019) | Olivier Blayac, L'Oréal Color&Co launch, The Drum, 9 May 2019. https://www.thedrum.com/news/2019/05/09/l-oreal-launches-direct-consumer-hair-dye-brand-colorco | Story, video |
| 4 | 47.8% of US women dyeing at home in lockdown worried the result wouldn't be what they wanted; 42.7% worried about picking the right shade | BRAND (Garnier/OnePoll, 2,000 US women) | Premium Beauty News, 18 Jan 2021. https://www.premiumbeautynews.com/en/at-home-hair-dyeing-a-first-for,17831 | Story |
| 5 | 34% of UK women who do their own hair had to get a professional to fix it | BRAND (OnePoll, 2,000 women; covers cutting and colouring) | The London Economic, 31 May 2022. https://thelondoneconomic.com/lifestyle/women-are-worried-about-cutting-or-colouring-their-own-hair-at-home-324698/ | Story, video |
| 6 | 73% of US women who dye at home spend under $20 on a box | BRAND (Better Natured, 1,500 women, Feb 2024) | https://www.stocktitan.net/news/SBH/better-natured-r-declares-national-hair-color-day-with-new-findings-24j6umihqahc.html | Story, video |
| 7 | Average colour-correction appointment in the US: $210 | WEAK (StyleSeat booking data) | https://www.styleseat.com/blog/color-correction-hair/ | Story, video ("about ten times the box") |
| 8 | 1 in 5 UK women have cried over a bad hair day; 6% cancelled plans | BRAND (OGX, 2,000 women, Jan 2024) | HJI, 22 Jan 2024. https://hji.co.uk/61-feel-empowered-when-our-hair-is-looking-great | Story |
| 9 | India: 42% of hair-dye users reported side effects; 34% never did a skin test | DATA (peer-reviewed, 263 people, one district) | Patel et al., Int J Trichology 2013. https://pubmed.ncbi.nlm.nih.gov/24574693/ | Story |
| 10 | Hair dye reactions are "fairly common but are usually mild" | DATA | NHS, reviewed 29 Dec 2025. https://www.nhs.uk/conditions/hair-dye-reactions/ | Safety section |
| 11 | A 59-year-old woman in London died of anaphylaxis to hair dye used at home; the coroner: "It is likely that an anaphylactic reaction to the hair dye caused her death" | NEWS | SWNS, 8 Oct 2026. https://discover.swns.com/2026/10/mum-died-after-allergic-reaction-to-hair-dye-inquest-hears/ | Safety section only, never as a hook |
| 12 | From naturally dark hair (level 2), 178 of our 202 real L'Oréal Paris and Garnier boxes are lighter than the hair. With a 2-level lift, 48 of them (27%) are expected to reach the shade on the box. With 3 levels, 81 (46%). | OURS (computed by the Bense rules engine from brand-published lift limits; a prediction, not a measured outcome) | `shared/catalogue/shades.brands.json`, `shared/domain/predictionEngine.ts`. Re-run: see "How to re-run" below | Story, video, gallery |
| 13 | India only: 47 of 53 real shades are lighter than level 2 hair; 14 are expected to reach their box shade with a 2-level lift | OURS (same method) | as above | Optional |
| 14 | Hair level measured live: docs blonde sample L\* 58.5, level 8, the same in two renders hours apart (58.58 and 58.5) | OURS (live YouCam, 2026-10-15) | `docs/youcam-api/README.md` | Tech section |
| 15 | Colour reading, hair mask and measurement in the browser: 12.3 s in parallel; two Hair Color renders: 12–15 s; whole colour journey 33.2 s | OURS (live, 2026-10-15) | `app/README.md` | Tech section |
| 16 | One colour check costs 21 YouCam units (Facial Color Tones 20 + hair mask 1); the reveal adds 2 | OURS (YouCam docs + live runs) | `app/README.md` | Tech section |
| 17 | 202 real shades (L'Oréal Paris India 34, USA 94; Garnier India 19, USA 55), 96 products left out because their code gives no whole level or they are lighteners | OURS | `shared/catalogue/shades.brands.json`, import log | Tech section |
| 18 | 166 unit tests and 34 browser tests | OURS | `npm test`, `npm run test:e2e` (re-check the counts on submission day) | Tech section |

## Numbers we deliberately do NOT use

- "45% of US women colour to cover grey" (Pew 2025): the 45% only appears second-hand; Pew's own page says 27% of all adults. Use only if checked on pewresearch.org.
- "30% of a stylist's bookings are box-dye fixes": one stylist's guess on a low-quality page. No survey exists.
- Market size ($28 bn): true but it adds nothing to a story about one person's hair. Optional in "Impact".
- India hair-dye poisoning data: a different, sensitive problem. Never in this pitch.
- Any accuracy percentage for Bense's level measurement: we have not tested against known levels yet. Say so instead.

## How to re-run number 12

```sh
cd app
# prints, for each lift (1–3) and starting level (1–4), how many lighter real boxes reach their shade
npx tsx -e "
import { engineConfig, predict } from './shared/domain/predictionEngine'
import { SHADES } from './shared/domain/shadeCatalogue'
const real = SHADES.filter((s) => s.brand)
for (const lift of [1, 2, 3]) {
  const lighter = real.filter((s) => s.level > 2)
  const reach = lighter.filter((s) => predict({ start: { level: 2, previouslyDyed: 'no', method: 'manual' },
    target: { level: s.level, tone: s.tone, permanence: s.brand!.permanence },
    safety: { previousReaction: false, blackHenna: false, browsOrLashes: false } }, engineConfig({ liftLevels: lift })).result?.reachesTarget)
  console.log('lift', lift, 'lighter', lighter.length, 'reach', reach.length)
}"
```

## Before submitting

- [ ] Ask your girlfriend if she is OK with her story being public. Keep her unnamed unless she says otherwise.
- [ ] Hair Type and Frizz: update the honesty line if they now work live.
- [ ] Re-count tests and units used.
- [ ] Screenshot TikTok/Reddit counts yourself if you want social-media numbers (we could not fetch them reliably).
