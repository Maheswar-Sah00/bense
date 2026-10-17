# Bense: who else is working on "will this box dye work on my hair?"

Researched 2026-10-16. Sources are web pages, press releases, patents and Devpost pages, all linked inline.
**Legend:** ✔ = confirmed in a source · ✘ = a source says no, or the description has no such step · ? = not stated / unverified · "(unverified)" = only a secondary or low-quality source, or my inference.
I did not run any of these tools myself. "Considers starting level" means what the vendor's own description says, not something I tested.

---

## 1. Comparison table

| Player | What it is | Platform | Launched | Measures current hair level? | Asks dye history? | Warns "this shade won't work" / sends you to a colourist? | Shows realistic result vs box promise? | Key numbers |
|---|---|---|---|---|---|---|---|---|
| **L'Oréal Paris Hair Color Genius / "Coloration Genius"** (US, CA, IN) | AR try-on of L'Oréal Paris shades | Web (live camera or photo) | ? (US article dated 2021-05-01) | Uses your photo "in your current hair color". It is a recolour, and no level number is shown | ✘ not mentioned | Claims it can show "if you'll need to bleach". How it does that is unverified | ✘ shows the target shade only. A slider compares current vs new | none published |
| **ModiFace** (L'Oréal-owned) | AR/AI engine behind most L'Oréal, Garnier and (earlier) Clairol hair try-ons | SDK / web / app | Acquired by L'Oréal Mar 2018 | Patent (granted 2026) classifies hair shade 1–10 from a photo | ✘ | ✘ | Partly: the generator conditions on the source hair colour. There is no dye-chemistry model | 220k annotated images (one source, unverified) |
| **L'Oréal Professionnel Style My Hair** | Salon/consumer try-on app, 3D hair-colour tracking | iOS/Android | 2015 app; 3D colour Jan 2018 | ✘ | ✘ | ✘ (stylist does that) | ✘ | 2.3M organic downloads (2018) |
| **L'Oréal Paris hair-color quiz / Colorsonic quiz / "Hair Color Concierge"** | Shade-finder quizzes | Web | ? | ? (questions not visible to crawler) | ? | ? | ✘ | none |
| **L'Oréal Colorsonic** | Handheld at-home mixer/applicator + cartridges | Device + web | Shown CES 2022; sold 2024-06-05 (colorsonic.com), Target ~1,000 stores late Jul 2024 | ✘ (a quiz picks the cartridge) | ? | ✘ | ✘ | $124.99 device, $29.99 cartridges, 20 shades at launch (40 announced) |
| **L'Oréal Coloright** (salon) | Reader measures hair colour, % grey, length, density → dispenser mixes 1,500+ custom shades. VTO for stylist | Salon device | Coloright startup acquired Dec 2014; system shown Jan 2022 | ✔ measures hair colour + grey % (device, not photo) | ✘ (not stated) | Stylist-mediated | VTO of target shade | Rollout status unknown |
| **Garnier Shade Selector / Color Match quiz + VTO** (US, IN, UK) | 1-minute quiz → 2–4 shades → try-on (ModiFace) | Web, in-store tablets | Feb 2019 (Walmart pilot) | Asks current colour + grey (self-reported) | ✘ not mentioned | ? | ✘ | 132 shades at launch. 10 → 37 stores by end-2019. ">30%" quiz completion online |
| **Google Search AR hair colour** | "Try it on" for L'Oréal-group shades in Search | Google app / mobile web, US | 2023-10-25 (secondary source). Earlier: Garnier via Google Lens 2019 | ✘ | ✘ | ✘ | ✘ | none published |
| **Snapchat × L'Oréal Paris Féria** | QR code on Walmart boxes opens a 15-colour lens | Snapchat | May 2024. Earlier Snap Camera lenses Apr 2020 | ✘ | ✘ | ✘ | ✘ | none published |
| **TikTok "AI hair dye split" filter** | Entertainment filter that "chooses" a colour | TikTok | ? | ✘ | ✘ | ✘ | ✘ | 1.6M+ videos (creator claim via Nylon) |
| **YouTube AR Beauty Try-On** | Lipstick try-on in videos/ads | YouTube | 2019 | n/a (no hair colour found) | | | | 30% opted in, 80 s avg (lipstick) |
| **Henkel Choicify** (Schwarzkopf, göt2b, etc.) | Online consultation + AR. Shade data from strands dyed and measured with a colour device | Web; embedded in Amazon & Walmart; Boots UK | Built 2018; US Oct 2020 | Asks current colour (Boots version). Not measured from photo | ? | ? | ✘ (simulated on photo) | none published |
| **Schwarzkopf Professional SalonLab** | Analyzer (NIR + visible sensors): inner hair quality, moisture, "true hair color". Customizer, Consultant app with AR | Salon device + app | CES 2018. EMEA Sep 2020, US early 2021 | ✔ (device, salon only) | Indirectly (damage measured) | Stylist-mediated | AR preview of target | No salon counts found |
| **Clairol MyShade** (then P&G, now Wella Co.) | Try-on (ModiFace), barcode scan, hair advisor quiz | iOS/Android | ~Nov 2016 | ✘ not stated | ? | ✘ | ✘ | Current status unknown |
| **Revlon VTO** | 600+ shades try-on. Lists Color Effects Platinum bleach, no ColorSilk | Web | ? | ✘ | ✘ | ✘ | ✘ | – |
| **Madison Reed** (Color Advisor quiz, Madi bot, try-on, Hair Color Bars) | DTC kits + quiz + selfie bot + Perfect Corp try-on + 97 salons | Web, SMS/Messenger, salons, Ulta | Quiz 2016; Madi Nov 2016; try-on Oct 2018; Sierra agent Oct 2025 | Selfie → "primary colour + secondary tones" (Madi) | Asks "do you currently colour?" | Colourists available; no automatic "won't work" verdict found | ✘ | 20M+ virtual colour matches; 97 bars; ~$220–250M raised; valuation reported $500M–1B (2021) |
| **eSalon** | Quiz + photos → human colourist writes formula | Web, mail | 2010 | Colourist judges from photo | ✔ hair history asked | ✔ human colourist | ✘ | 10.5M+ orders (self-reported); ~250k subscribers (2019); Henkel majority stake 2019 |
| **Color&Co** (L'Oréal) | Video call with colourist → custom kit | Web | 2019-05-08 | Colourist on video | ✔ | ✔ human | ✘ | Shut down Mar 2022 |
| **Overtone** (semi-permanent) | Shade guides by starting colour | Web | ? | Self-reported | ? | ✔ says shades "won't show" on jet black | Static swatches only | – |
| **Kristin Ess** | Glosses at Target | Retail | – | No tool found | | | | – |
| **Perfect Corp / YouCam** | YouCam Makeup app hair colour; B2B try-on for Paul Mitchell, Madison Reed (2018), Aveda (2019), Better Natured/Henkel (2021); 11-API hair suite (Jun 2026) | App, web SDK, API | Hair suite 2026-06-16 | Hair *type/length/frizz/density* APIs. No level API | ✘ | ✘ | ✘ (recolours to target RGB) | 801 brand clients (Mar 2025, secondary); 1B+ app downloads (2022). MR case: "38%" conversion |
| **yuv** (London) | App-connected salon dispenser + AI formulation | Salon device | Series A Dec 2025 | ? | ? | Colourist-mediated | ✘ | $12M Series A |
| **Hair Dye Selection** (iOS, indie) | Two photos (current + target) → dye number, level, step plan, "honest warnings about difficult transitions" | iOS | 2026-04-16 | Claims tone level (unverified accuracy) | Colour diary only | ✔ (claims warnings) | ✘ no render of the realistic result | <1k downloads, 2 ratings |
| **Dyecode** (open source) | Rules engine: level, tone, history (virgin/dyed darker/dyed lighter), porosity → predicted result, warnings, bleach plan | Web (Next.js) | Repo created 2026-03-04 | ✘ self-entered (no photo) | ✔ | ✔ | Canvas strand swatch, not your photo | 0 stars |
| **P&G VS Sassoon kiosk patent** (US6707929) | Colorimeter readings → PLS models predict *achievable* end colours for 16 shades → render on image | Kiosk | Filed 2000/2001, granted 2004, expired | ✔ (colorimeter) | Asks colouring frequency | ✔ shows only achievable colours | ✔ rendered predicted colour | Patent only. Commercial use unverified |
| **Henkel patent US11035801** | Measures damage (NIR) + colour (camera/spectro, L\*a\*b\*) per hair zone → predicts dye result, picks closest dye | Device/method | Priority 2017, granted 2021 | ✔ | ✔ via damage | ✔ (chooses dye with smallest colour distance) | ✔ predicted | Patent only |
| **Hackathon projects** (Devpost, see §6) | Try-on + booking | Web/mobile | 2021–2026 | ✘ (none found) | ✘ | LookLock: stylist-side "lightening warning" | ✘ | – |

**Bottom line of the table:** consumer tools recolour your photo to the target shade. Tools that measure your starting level are salon devices (SalonLab, Coloright), patents (P&G 2001, Henkel 2017), or human colourists (eSalon, Color&Co, Madison Reed bars). I found no consumer box-dye tool that measures the starting level from a selfie, applies the brand's own lift and "dye can't lift dye" rules, and renders the *likely* result next to the *promised* one.

---

## 2. L'Oréal group

### L'Oréal Paris Hair Color Genius / "Coloration Genius"
- **What:** A browser try-on of L'Oréal Paris permanent, semi-permanent and temporary shades, using live camera or a photo. It has a split-screen slider for current vs new. The Canadian page is titled "Hair colour virtual try-on" at `lorealparis.ca/en-CA/coloration-genius`. The page itself gives no flow details and offers a phone line (1-888-4LOREAL). [lorealparis.ca](https://lorealparis.ca/en-CA/coloration-genius)
- **Starting colour:** The US article (2021-05-01) says "upload a photo of yourself in your current hair color (this is important for the outcome of your shade)". It also claims the tool shows how a shade "will actually pick up on your current hair tone and undertone" and "if you'll need to bleach to get your desired hue". [L'Oréal Paris USA](https://www.lorealparisusa.com/beauty-magazine/hair-color/hair-color-application/test-new-hair-colors-with-virtual-try-on-tool), [blonde article](https://www.lorealparisusa.com/beauty-magazine/hair-color/hair-color-application/blonde-virtual-try-on-hair)
  - **Unverified:** How the tool decides "need to bleach" is not documented. It shows no level number, asks no dye-history question, and gives no "won't work" verdict in any description I found. The technology provider is not named on the page. ModiFace is likely, but that is my inference.
- **India:** [lorealparis.co.in/hair-color-virtual-try-on](https://lorealparis.co.in/hair-color-virtual-try-on) offers real-time or selfie try-on across permanent, semi-permanent and temporary shades.
- **UK:** A "Hair Colour Diagnostic" quiz (Preference, Casting Crème Gloss) promises "an achievable colour with great results". Its questions were not visible to me. [loreal-paris.co.uk](https://www.loreal-paris.co.uk/asda-haircolour)
- **US quizzes:** "Find Your Hair Color Shade" quiz, a Colorsonic quiz, a "Hair Color Concierge", and a Walmart-specific quiz copy. The questions are JS-rendered and were not visible to me. [quiz](https://www.lorealparisusa.com/hair-color-quiz), [Colorsonic quiz](https://www.lorealparisusa.com/colorsonic-hair-color-quiz)

### ModiFace (acquired by L'Oréal, March 2018)
- L'Oréal's first tech acquisition. Terms were undisclosed. ModiFace was a U of Toronto spin-off. [The Varsity](https://thevarsity.ca/2018/04/02/loreal-acquires-u-of-t-spin-off-modiface/)
- One secondary source says hair segmentation was trained on 220,000 manually annotated images and the system uses CNN plus GAN hybrids (unverified). [deeplearning.ai](https://charonhub.deeplearning.ai/a-good-look-for-ai/)
- **Patent US12657787 B2** (L'Oréal / ModiFace, filed 2023-12-07, granted 2026-06-16), "Hair color simulation using a hair color classification guided network". A classifier estimates hair **shade 1–10** and reflectance from a photo. The try-on generator takes the target colour plus "image hair color data determined from the image". It contains no model of how a dye lightens or deposits on existing hair. **This is the closest big-company building block to Bense's level measurement, and it is a patent, not a shipped consumer feature that I could confirm.** [Google Patents](https://patents.google.com/patent/US12657787)
- **Research:** Bokaris, Malherbe, Wasserman, Haddad, Perrot, "Hair Tone Estimation at Roots via Imaging Device with Embedded Deep Learning", IS&T Electronic Imaging 2019. A CNN estimates natural hair tone from macro images of roots under fixed lighting on a dedicated device. Expert-rated labels were used, and no accuracy figure appears in the abstract. Affiliation is likely L'Oréal R&I (not shown on the page, so unverified). [IS&T library](https://library.imaging.org/ei/articles/31/6/art00010)

### L'Oréal Professionnel Style My Hair
- App from 2015. Real-time 3D hair-colour try-on with ModiFace launched Jan 2018. It tracks strands and is used in salon consultations. Over 2.3M organic downloads at the time. [Premium Beauty News](https://premiumbeautynews.com/en/l-oreal-professionnel-launches-new,12817), [FashionNetwork](https://ie.fashionnetwork.com/news/L-Oreal-launches-3D-AR-hair-color-simulation-app,939165.html), [L'Oréal](https://loreal.com/en/news/research-innovation/style-my-hair-putting-artificial-intelligence-to-work-for-consumers)

### Colorsonic (at-home device)
- Announced Jan 2022 ahead of CES. It is a handheld mixer/applicator with an oscillating nozzle. L'Oréal said 40 ammonia-free shades and a US launch "early 2023" after 5–7 years of development. [FashionUnited](https://fashionunited.uk/news/fashion/l-oreal-looking-to-reinvent-hair-colouring-with-new-beauty-tech-innovations/2022010760457), [Reviewed](https://reviewed.com/beauty/features/loreal-unveils-colorsonic-home-hair-coloring-device-ces-2022)
- **Actually launched 2024-06-05** on colorsonic.com, then at about 1,000 Target stores in late July 2024. Device $124.99, cartridges $29.99, 20 shades. [Mass Market Retailers](https://massmarketretailers.com/loreal-paris-launches-colorsonic-for-easier-hair-coloring/), [Perfumer & Flavorist](https://www.perfumerflavorist.com/home/news/21977300/loreal-loral-paris-colorsonic-device-drops-exclusively-at-target-delivering-techenabled-athome-color)
- It solves *application mess*, not shade prediction. No sales data was found after 2024.

### Coloright (L'Oréal Professionnel, salon)
- L'Oréal acquired Tel Aviv start-up Coloright ("hair fibre optical reader technology") in Dec 2014. Terms were undisclosed. [L'Oréal Finance](https://www.loreal-finance.com/eng/news/news-release-987.htm), [FashionNetwork](https://uk.fashionnetwork.com/news/L-oreal-acquires-coloright,530984.html)
- Shown Jan 2022 as an AI-connected salon system. A reader measures **hair colour, % grey, length, density**. A dispenser mixes dry dye beads, creams and developers into **1,500+ custom shades**, with VTO for the stylist. No rollout dates or salon counts were found. [FashionUnited](https://fashionunited.uk/news/fashion/l-oreal-looking-to-reinvent-hair-colouring-with-new-beauty-tech-innovations/2022010760457), [Happi](https://www.happi.com/breaking-news/loreal-unveils-consumer-and-salon-haircolor-tech-innovation-ahead-of-ces/)
- **This is the professional version of what Bense does: measure, then decide.** It needs a salon device and a stylist.

### Color&Co (L'Oréal DTC)
- Launched 2019-05-08 from L'Oréal's Technology Incubator. It offered a 10–15 min live video consult with a licensed colourist (or a questionnaire), then a custom "Colorbox". Prices were $26.19 one-off or $19.90 subscription. GM Olivier Blayac said **"up to 70% of at-home color users are unsure which shade suits them."** [The Drum](https://www.thedrum.com/news/2019/05/09/l-oreal-launches-direct-consumer-hair-dye-brand-colorco), [Marketing Dive](https://marketingdive.com/news/loreal-extends-personalization-push-with-dtc-at-home-hair-color-brand/554200), [Beauty Packaging](https://www.beautypackaging.com/contents/view_breaking-news/2019-05-09/colorco-by-loreal-aims-to-transform-at-home-hair-color)
- **Shut down March 2022.** Wikipedia (single source) also mentions customer complaints about results. [Wikipedia](https://en.wikipedia.org/wiki/Color%26Co)

### Garnier (L'Oréal)
- **Shade Selector by ModiFace (Feb 2019):** a six-part quiz of about 60 seconds covering current colour, grey level and desired look, then photo/live try-on, then 2–4 shade suggestions. It covered Nutrisse, Olia and Color Sensation, with 132 shades at launch. The in-store pilot used tablets at 10 Walmarts, then 5 Wakefern and 12 Meijer stores, for **37 locations by end-2019**. Online, **>30% of consumers completed the quiz**. Conversion lift was not disclosed. [Glossy](https://www.glossy.co/beauty/garnier-is-rolling-out-hair-coloring-personalization-tools-in-walmarts), [GCI](https://www.gcimagazine.com/brands-products/hair-care/news/21869803/garniers-virtual-shade-selector-takes-guesswork-out-of-at-home-coloring), [Drug Store News](https://www.drugstorenews.com/beauty/garnier-unveils-shade-selector-by-modiface/)
- The current US quiz page says it asks "questions related to your current hair color… your hair's condition, and what you wish to change". It does not mention previously coloured hair or unachievable shades. [garnierusa.com](https://www.garnierusa.com/dummy-my-shade-selector), [VTO](https://garnierusa.com/beauty-services-and-tools/virtual-try-on)
- **India:** Browser try-on with no app; Color Naturals pages point to it. [garnier.in](https://www.garnier.in/hair-color-virtual-try-on), [Color Naturals](https://www.garnier.in/about-our-brands/color-naturals)
- **Google Lens × Garnier (2019)** try-on, per Retail Dive. [Retail Dive](https://retaildive.com/news/google-adds-hair-color-augmented-reality-try-on-tech/697736)

---

## 3. Other mass brands

### Henkel / Schwarzkopf
- **Choicify:** Built by Henkel Beauty Care in 2018 and launched in the US Oct 2020. It is an AI+AR online consultation (photo, model or live). It covers Schwarzkopf Simply Color, Color Ultime, Keratin Color and göt2b, and is embedded in **Amazon's** hair-colour purchase flow and Walmart's online experience. Its database is built from Henkel retail products **dyed onto real hair strands and measured with a colour-detection device**. That is a real outcome dataset, but the user's starting hair is still self-reported or shown on a photo. [Henkel NA](https://www.henkel-northamerica.com/press/press-releases-and-kits/2020-30-10-henkel-launches-innovative-ai-hair-color-tool-in-us-1126642), [Henkel × Amazon](https://www.henkel.com/press-and-media/press-releases-and-kits/2020-11-03-henkel-beauty-care-intensifies-collaboration-with-amazon-ai-powered-choicify-simplifies-shopping-for-hair-colorations-1127098). The UK Boots version "asks for your current colour to recommend a shade". [Boots](https://boots.com/schwarzkopf-choicify)
- **Schwarzkopf "LIVE" colour consultancy / Color Lounge:** a virtual try-on on brand sites. [schwarzkopf.international](https://www.schwarzkopf.international/brands/hair-colour/live.html)
- **Better Natured (Henkel DTC):** Perfect Corp try-on plus quiz, 26 shades, Mar 2021. [Perfect Corp](https://www.perfectcorp.com/business/news/detail/1630)
- **eSalon:** Henkel took a majority stake in July 2019 (CB Insights). See §4.

### Schwarzkopf Professional SalonLab (salon device)
- Shown at **CES 2018**: the **SalonLab Analyzer** is a handheld with near-infrared and visible-light sensors measuring "inner hair quality, moisture level and true hair color" at points from roots to tips. It comes with the **Customizer** (made-to-measure products) and **Consultant App** (AR colour preview before application). [Henkel CES 2018](https://henkel.com/press-and-media/press-releases-and-kits/2018-01-03-schwarzkopf-professional-salonlab-at-ces-2018-814378) (page now 404s; the description is quoted via [Happi](https://www.happi.com/contents/view_breaking-news/2018-01-03/schwarzkopf-professional-unveils-salonlab/) and the search snippet), [Engadget](https://www.engadget.com/2018-01-03-device-tell-you-how-bad-your-hair-is.html), [Behind The Chair](https://behindthechair.com/articles/btc-exclusive-technology-will-change-way-consultations/)
- Sep 2020 release: after user tests in Europe and Asia, rollout to the rest of EMEA in Sep 2020 and the **USA in early 2021**. The 2020 release emphasises NIR inner-hair quality and the Fibre Clinix bond service, not colour. No salon counts and no discontinuation notice were found. [Henkel NA 2020](https://www.henkel-northamerica.com/press/press-releases-and-kits/2020-09-16-schwarzkopf-professional-paves-the-way-forward-with-a-digital-revolution-in-hair-diagnostics-1114510)
- **Henkel patents:** **US11035801B2** "computer-assisted determination of a hair colouring outcome" (priority 2017-07-07, granted 2021-06-15). It measures damage per hair zone (NIR spectra against an HPLC-calibrated model) and colour (camera or UV/VIS spectro, L\*a\*b\*), predicts the dyed result for a given dye, and **selects the dye with the smallest colour distance to the desired colour**. [Google Patents](https://patents.google.com/patent/US11035801). Related: EP3390992B1 (regression/NN models trained on dyeing different starting hair colours) [Patsnap](https://eureka.patsnap.com/patent-EP3390992B1); US12121133 (grey level from strand image) [Google Patents](https://patents.google.com/patent/US12121133).

### Clairol (P&G until 2016, then Coty, now Wella Company)
- **MyShade app** (~Nov 2016, iOS/Android): try-on on your photo (ModiFace per a 2016 trade report), barcode scan including competitor boxes to match "to the closest Clairol shade", hair-advisor questionnaire, and call/email a Clairol expert. Current status is unknown. [Happi 2016](https://www.happi.com/contents/view_breaking-news/2016-11-14/clairol-creates-new-shade-selection-app/), [Retail Dive](https://www.retaildive.com/ex/mobilecommercedaily/clairol-eases-hair-dye-customers-worries-by-letting-them-test-colors), [Fox in Flats 2017](https://www.foxinflats.com.au/2017/05/find-your-perfect-hair-colour-with-this-easy-myshade-app)
- Current Clairol AU/CA Nice'n Easy pages show a "Let's find your shade" prompt. I could not verify its questions. [clairol.com en-CA](https://clairol.com/en-CA/nice-n-easy)
- **Historical precedent (P&G):** **US6707929** "Method for analyzing hair and predicting achievable hair dyeing ending colors" (filed 2001, CIP of 2000, granted 2004-03-16, expired). A counsellor takes **6 colorimeter readings** (L\*a\*b\*). **Partial-least-squares models predict the post-dye colour for each of 16 shades**. The system **"displays achievable end hair colors"** and renders the predicted colour on an image. It asks how often you coloured in the past year. The welcome screen names **VS Sassoon** products and a kiosk. **This is Bense's logic on a kiosk with a colorimeter, 25 years ago.** Whether it was deployed commercially is unverified. [Google Patents](https://patents.google.com/patent/US6707929)

### Revlon
- Revlon's VTO advertises "over 600 shades". Its page lists **Color Effects Platinum hair bleach**, but no ColorSilk/box colour was found. [revlon.com](https://www.revlon.com/pages/how-to-use-virtual-try-on). Google said in 2023 that Revlon and Splat would follow L'Oréal in Search hair-colour try-on; whether they did is unverified.

---

## 4. Direct-to-consumer custom colour

### Madison Reed
- **Colour quiz** since 2016, with **20M+ virtual colour matches** to date (company, Oct 2025). The quiz covers hair profile, **"whether they currently color their hair"**, and goals. [Business Wire 2025](https://www.businesswire.com/news/home/20251008235213/en), [Perfect Corp case study](https://www.perfectcorp.com/business/successstory/Madison-Reed)
- **Madi** (Nov 2016) is a Messenger/SMS bot. You send a selfie and computer vision returns "primary hair color and secondary tones", followed by follow-up questions. It replaced a 12-question quiz. At Ulta, you text a selfie to 34757. [Madison Reed press](https://www.madison-reed.com/about/press/release/9/madison-reed-a-technology-startup-with-color-at-its-core-further-disrupts-the-hair-care-industry-by-introducing-madi-a-facebook-messenger-chatbot-with-computer-vision), [Inc.](https://www.inc.com/salvador-rodriguez/want-perfect-hair-just-send-this-startup-your-selfie.html), [Drug Store News](https://drugstorenews.com/beauty/madison-reed-expands-ulta-beauty-footprint)
- **Try-on with Perfect Corp/YouCam** (Oct 2018, 40+ shades, later 50+) uses a current-vs-new split screen. In the case study, "at least 38% of those who go through our color quiz and then explore our hair colors… convert" (vendor-published, no baseline). [Beauty Packaging](https://www.beautypackaging.com/contents/view_breaking-news/2018-10-25/madison-reed-collaborates-with-youcams-team-to-launch-its-hair-color-try-on-tool/)
- **Sierra-built Madi agent** (Oct 2025) handles up to 100% of web traffic, with 30× chat interaction, 2× booking likelihood and cancellations halved (company claims). **97 Hair Color Bars.** [Business Wire](https://www.businesswire.com/news/home/20251008235213/en)
- **Funding:** $33M in Apr 2022 led by Sandbridge. Total reported at about $220–250M. Valuation reported as $500M–1B (2021). Color bars went from 12 (Mar 2020) to about 60 (2022). [Retail Brew](https://www.retailbrew.com/stories/2022/04/28/madison-reed-lands-usd33-million-in-funding), [Glossy](https://www.glossy.co/beauty/madison-reed-raises-33-million-in-new-funding-round-as-it-strives-to-disrupt-the-terrible-box-on-the-shelf), [BoF](https://www.businessoffashion.com/articles/beauty/madison-reed-raises-33-million-with-an-eye-on-brick-and-mortar/)
- **Gap:** The selfie reads colour to *match a shade*. I found nothing that applies lift limits or says "box won't do this". The fallback for hard cases is the human colourists and color bars.

### eSalon
- Quiz on hair history and goals, plus photos of current hair and the goal, reviewed by a **human colourist** who writes a custom formula and assigns developer strength. Company claims "280,000+ unique color combinations" and "10.5M+ orders shipped" (undated, self-reported). Glossy (Mar 2019) reported about 250k active subscribers. CB Insights reports about $15.3M raised and a **Henkel majority deal in July 2019**. [eSalon](https://get.esalon.com/how-we-make-custom-color), [Glossy](https://www.glossy.co/beauty/catering-to-spanish-speaking-customers-is-fueling-esalons-growth), [CB Insights](https://www.cbinsights.com/company/esalon/financials)

### Others
- **Color&Co** (L'Oréal, 2019–2022): see §2.
- **Overtone** (semi-permanent): shade guides by starting hair colour. It explicitly says "For Brown Hair" shades **won't show on jet-black** hair, and that swatches are made on light hair. Static content, no photo measurement. [Overtone guide](https://overtone.co/blogs/overtone/which-overtone-shade-is-right-for-my-natural-hair-color-a-complete-shade-guide)
- **Kristin Ess:** glosses sold at Target. **No shade-finder or try-on tool found.** [Target](https://target.com/p/kristin-ess-signature-hair-gloss/-/A-79501968)
- **yuv** (London): app-connected salon dispenser with refillable cartridges and AI formulation. **$12M Series A, Dec 2025.** Record Dragons' Den deal at a £25M valuation, Oct 2025. Salon/freelance colourists only. [Tech.eu](https://tech.eu/2025/12/05/yuv-raises-12m-to-scale-sustainable-hair-colour/), [BeautyMatter](https://beautymatter.com/articles/hair-color-tech-yuv-raises-12-million-series-a)

---

## 5. Platforms: Perfect Corp, Google, Snapchat, TikTok

### Perfect Corp / YouCam (the hackathon host)
- **Consumer:** the YouCam Makeup app hair-colour feature. Brand hair-colour deals include Paul Mitchell (first hair brand in YouCam, ~2016, date unverified), **Madison Reed (Oct 2018, first time YouCam hair colour was embedded on a DTC website)**, **Aveda (Nov 2019, 90+ shades plus "Color Melt" ombré for 30 shades)** and **Better Natured/Henkel (Mar 2021, 26 shades)**. [GCI Paul Mitchell](https://www.gcimagazine.com/brands-products/hair-care/news/21872821/paul-mitchell-gives-consumers-hair-color-without-commitment), [Beauty Packaging (MR)](https://www.beautypackaging.com/contents/view_breaking-news/2018-10-25/madison-reed-collaborates-with-youcams-team-to-launch-its-hair-color-try-on-tool/), [Drug Store News (Aveda)](https://drugstorenews.com/youcam-makeup-aveda-debut-virtual-hair-color-try-experience), [Perfect Corp (Better Natured)](https://www.perfectcorp.com/business/news/detail/1630)
- **API:** On **2026-06-16** Perfect Corp launched an 11-API "AI Hair & Beard" suite: 7 try-on (including hair colour with an unlimited RGB palette and ombré) and 4 diagnostics (hair **type, length, frizz, density**). **There is no hair colour/level measurement API**, which is why Bense measures lightness itself inside the YouCam hair mask. [Business Wire](https://secure.businesswire.com/news/home/20260616828286/en/Perfect-Corp.-Launches-Industrys-Most-Comprehensive-AI-Hair-Beard-API-Suite-Combining-Virtual-Try-On-with-Intelligent-Hair-Analysis), [Perfect Corp blog](https://www.perfectcorp.com/business/blog/hair/ai-hair-api)
- **Scale:** 1B+ YouCam app downloads (2022). 801 brand clients and 891k digital SKUs as of 2025-03-31 (secondary summary, unverified against filings). [Perfect Corp](https://www.perfectcorp.com/business/news/one-billion)
- **Hackathon:** "YouCam API Skin AI & eCommerce VTO Hackathon". Submissions close **2026-11-02**, winners around 2026-11-24, $6,000 prizes. Earlier-round winners (Aloud, ShadeSpan) were not hair-colour projects. [Business Wire](https://www.financialcontent.com/article/bizwire-2026-10-13-perfect-corps-youcam-api-hackathon-is-back-now-focused-on-ecommerce-with-a-6000-prize-pool)

### Google / YouTube
- **Google Search AR hair colour:** announced ~**2023-10-25** (secondary date). L'Oréal-group shades first, with Revlon and Splat "slated". US only, in the Google app or mobile web. Trade press noted segmentation can make colour "seem off". [Retail Dive](https://retaildive.com/news/google-adds-hair-color-augmented-reality-try-on-tech/697736), [Social Media Today](https://www.socialmediatoday.com/news/google-launches-ar-try-on-tools-for-hair-color-and-foundation/697834/), [Gigazine](https://gigazine.net/gsc_news/en/20231026-google-ar-beauty-shopping-ads)
- **Google Lens × Garnier** try-on (2019). Same Retail Dive source.
- **YouTube AR Beauty Try-On** (2019) is **lipstick only**. 30% of users turned it on, with an 80 s average. No YouTube hair-colour try-on was found. [Engadget](https://www.engadget.com/2019-10-14-youtube-ar-beauty-feature-ads.html)

### Snapchat
- **L'Oréal Paris Féria × Snapchat (May 2024):** a QR code on Féria boxes at Walmart opens a lens with **15 hair colours**, billed as the first national in-store haircare activation with Snap. No results published. [Retail TouchPoints](https://www.retailtouchpoints.com/news/loreal-taps-snapchat-for-ar-hair-color-try-on-in-walmart-stores/143365/)
- **Snap Camera (Apr 2020):** 8 L'Oréal USA lenses including Garnier hair colour. [Adweek](https://www.adweek.com/digital/loreal-usa-creates-8-custom-branded-ar-lenses-for-snap-camera-desktop-app/)

### TikTok
- An "AI hair dye split" filter "chooses" your colour, used in **1.6M+ videos** (creator claim). Nylon notes its suggestion changes day to day. Some people dyed their hair on its advice. [Nylon](https://www.nylon.com/beauty/hair-dye-split-filter-tiktok-trend-ai-chooses-your-hair-color)

---

## 6. Hackathon projects (Devpost and similar)

Method: Devpost's search JSON for "hair dye", "box dye", "hair color", "hair colour", "hair dyeing", "dye hair", "hair colorist", "hair bleach" and "hair salon color" (up to 3 pages each), plus web searches. **No Devpost project about box dye, or about predicting a dye result from current hair level, was found.** Hair-colour projects found:

| Project | Hackathon (submitted) | What it does | Starting level / history? |
|---|---|---|---|
| [LookLock](https://devpost.com/software/looklock-kda9my) | YouCam API Skin AI & eCommerce VTO (2026-10-13), **same hackathon as Bense** | Salon booking: YouCam Hair Length → price tier. YouCam Hair Color previews of salon menu. Cut+colour chaining. PayPal deposit hold. The stylist brief shows a **"lightening warning (strand test and bond treatment)"** and "AI preview, real results vary" | ✘ no level measurement. Notes YouCam presets rendered off-tone on brown hair ("Ash Gray green", "Honey Blonde mustard") and switched to tuned hex palettes |
| [GlamCode OS](https://devpost.com/software/glamcode-os-try-before-you-book) | YouCam API Skin AI & Apparel VTO (first round, 2026-08) | Salon SaaS: YouCam Hair Color (25 salon shades), Hair Transfer, Beard → WhatsApp booking | ✘ |
| [Hairstyle Try-On](https://devpost.com/software/hairstyle-try-on) | RevenueCat Shipaton 2026 | Braids/locs/silk press on hair types 1–4C. Keep own colour or take the style's colour | ✘ |
| [Beauty Studio – Glow Up AI](https://devpost.com/software/beauty-studio-glow-up-ai) | RevenueCat Shipaton 2026 | 92 analyses plus generative try-ons including hair colour | ✘ |
| [HairMatch AI](https://devpost.com/software/hairmatch-ai) | RevenueCat Shipaton 2026 | Haircut/colour/beard try-on for barbers | ✘ |
| [GlamurAI](https://devpost.com/software/hairstyle-try-on-glamai) | World's Largest Hackathon (Bolt), 2025-06 | Generative hairstyle + colour try-on | ✘ |
| [HairAI Studio](https://devpost.com/software/hairai-studio) | RevenueCat Shipaton 2025 | Gemini hairstyle generation | ✘ |
| [CuraStyl](https://devpost.com/software/curastyl) | AI Builders Hackathon 2026 | Salon marketplace + 3D WebAR try-on | ✘ |
| [Virtual Makeup / Face-Morph](https://devpost.com/software/face-morph) | SelfieHacks 2021 | Lists hair-colour try-on as a feature. The code is face morphing | ✘ |

Outside Devpost:
- **iGEM 2021 HUST-China "Dye Your Hair – Mr. Tony"**: a WeChat mini-program to "customize the hair dyeing process and get the predicted results", tied to a bio-based dye project. Details are from the search snippet only, as the pages returned 403. [iGEM](https://2021.igem.org/Team:HUST-China/Products)
- **Dyecode** (GitHub, created 2026-03-04, 0 stars, live at dyecode.vercel.app): "shows you what ACTUALLY happens when you dye your hair… no AI gimmicks, no face detection". You enter level 1–10, tone, history (virgin / dyed darker / dyed lighter), porosity and damage. It encodes "virgin hair lifts ~2–3 levels", "color doesn't lift color", and "bleach exposes warm pigment". Outputs are predicted colour, warnings, difficulty, a bleach plan and a canvas strand preview. **This is the closest rules engine to Bense, but it has no photo, no level measurement, no brand SKUs, and no render on your face.** [GitHub](https://github.com/sabuuuu/Dyecode)
- **UIT student project** "hair-dye-web-app" (2022–23): photo + chosen colour → recolour. [GitHub](https://github.com/nganngants/hair-dye-web-app)
- **Hair Dye Selection** (iOS, indie, 2026-04-16): two photos (current + target) → "dye numbers, tone levels" and "honest warnings about difficult color transitions". <1k downloads, 2 ratings. Accuracy is unverified and there is no render of the result. [mwm.ai listing](https://mwm.ai/apps/hair-dye-selection/6760969114)
- **HairS** (iOS): try-on plus paid stylist-written custom recipe (about 1 business day). [App Store](https://apps.apple.com/us/app/id1542645593)

---

## 7. Research (measuring hair colour from images; predicting dye outcome)

- **Photo vs instrument:** Victoria University (Forensic Sci. Int., 2009, n=134). Digital-image L\*a\*b\* correlated only moderately with a reflectance spectrophotometer (r ≈ 0.51–0.63) and overestimated values. Cluster assignment was 85.8% correct for 2 clusters and fell as clusters increased. **This supports Bense's white-card correction and "estimate, not measurement" framing.** [VU repository](https://vuir.vu.edu.au/4651/)
- **L\* is the most sensitive axis** for grey severity, with repeatability of hair L\* from photos of 0.2–5.3% (Antera 3D device, IFSCC 2022 abstract). [IFSCC abstract](https://coms.events/IFSCC2022/data/abstracts/en/abstract_0017.html)
- **Ileni, Borza, Darabant (VISAPP 2019)**, "Fast In-the-Wild Hair Segmentation and Color Classification": 5 colour classes from face images, 89.6% colour accuracy, 91.6% segmentation. [SciTePress](https://scitepress.org/Documents/2019/72505/)
- **Bokaris et al. 2019:** root-tone CNN on a dedicated device (see §2).
- **L'Oréal/ModiFace US12657787 (2026):** shade 1–10 classifier guiding a hair-colour generator (see §2).
- **Dye-outcome prediction, all patents and no public dataset found:** P&G US6707929 (2004, PLS per shade from colorimeter readings); Henkel US11035801 (2021) and EP3390992B1 (regression/NN on dyeing different starting colours); US10863816 (spectral model with keratin, eumelanin and pheomelanin concentrations, assignee unverified); hair-dye colour conversion family US10897979 / US11344103 / US11925251 / US12408744 (modified Kubelka-Munk mixing + regression, Wella Koleston example, assignee unverified). One custom-colouring patent notes that Kubelka-Munk fits hair poorly because dye penetrates the fibre. [US6707929](https://patents.google.com/patent/US6707929), [US11035801](https://patents.google.com/patent/US11035801), [US10863816](https://patents.google.com/patent/US10863816), [US10897979 PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10897979)
- **Generative hair recolouring** (HairFastGAN arXiv:2404.01094, Stable-Hair arXiv:2407.14078, iHairRecolorer) transfers a *reference* colour. None models dye chemistry or the starting level. [HairFastGAN](https://arxiv.org/abs/2404.01094), [Stable-Hair](https://arxiv.org/pdf/2407.14078)
- **Commercial API:** Haut.AI hair colour classification (Brown/Blond/Black categories, v1.0 deprecated). [Haut.AI docs](https://docs.saas.haut.ai/haut.ai/developers/saas-api-overview/hair-application/deprecated-version-1.0/hair-color)
- **Not found:** any peer-reviewed study that validates a *smartphone selfie* against a reference instrument for hair *level*, and any public before/after dye dataset.

---

## 8. Gap analysis: what nobody does (as of 2026-10-16, based on what I could find)

1. **Measuring the starting level from a selfie, for a consumer, before buying a box.**
   - Starting colour is *measured* only by salon hardware (SalonLab Analyzer, Coloright reader), old or patent-stage systems (P&G kiosk colorimeter, Henkel NIR/camera), or human colourists (eSalon, Color&Co, Madison Reed bars).
   - Consumer tools either *ask* (Garnier, Choicify, Madison Reed quiz), *read colour to match a shade* (Madison Reed's Madi), or just recolour your photo (Hair Color Genius, Google, Snapchat, YouCam).
   - L'Oréal/ModiFace has a patented shade 1–10 classifier (granted Jun 2026). I found no evidence it is shown to shoppers or used to block impossible shades.

2. **Dye history as a hard rule ("dye can't lift dye").**
   - Only humans (eSalon, Color&Co), a patent (Henkel, via damage), and one tiny open-source tool (Dyecode, self-entered) use it.
   - Madison Reed asks "do you currently colour?" but I found no evidence the answer blocks shades. No brand try-on asks it.

3. **Showing the *likely* result next to the *promised* one, on your own photo.**
   - Every consumer try-on renders the *target* shade. L'Oréal's split slider compares *current vs promised*, not *promised vs likely*.
   - Rendering the predicted result exists only in P&G's 2004 patent (kiosk) and Henkel's patent (no consumer product found).
   - Even a hackathon peer (LookLock) found YouCam's ash preset turns green on brown hair in the render and fixed it cosmetically. It did not tell the user that ash on lightened brown hair can actually turn green.

4. **Saying "this box won't work: try shade X, or see a colourist", using the brand's own published rules.**
   - Brands publish the rules (box backs, FAQs, Overtone's "won't show on jet black"), but their tools don't apply them per user.
   - Garnier and L'Oréal UK say they help find an "achievable" colour, but no description shows a refusal or a colourist referral. Hair Color Genius claims it can show "if you'll need to bleach", and the mechanism is undocumented.
   - Hand-off to a professional exists only where the company sells the professional (Madison Reed bars, eSalon, Paul Mitchell salon locator).

5. **Neutral across brands and markets (India + USA, L'Oréal + Garnier SKUs).**
   - Brand tools cover one house. MyShade's barcode cross-brand matching (2016) is the only cross-brand matching I found, and its status is unknown.
   - India tools (L'Oréal Paris IN, Garnier IN) are pure try-ons.

6. **Evidence that the problem is real and unmet:**
   - L'Oréal said "up to 70% of at-home color users are unsure which shade suits them" (2019).
   - L'Oréal killed its human-colourist DTC (Color&Co, 2022).
   - Madison Reed and eSalon scale with paid human colourists and salons rather than automated "won't work" logic.
   - Hair segmentation and colour realism remain a known weakness of AR try-on (Social Media Today on Google; LookLock's off-tone presets).

**What is not new (avoid claiming it):**
- Shade quizzes, AR hair-colour try-on, measuring hair with a salon device, and predicting dye outcome in principle (P&G 2001, Henkel 2017 patents; Dyecode rules).
- Bense's defensible novelty is the **combination**: selfie-based level estimate (with light correction) + dye-history rules + real SKU data for L'Oréal Paris / Garnier in India and the USA + a side-by-side "promise vs likely" render + an explicit "pick this closer box / see a colourist" verdict.

### Unverified / open items
- Exact questions in the L'Oréal Paris US quiz, Garnier's current quiz, and the Clairol "find your shade" tool (JS-rendered and not readable by me).
- Whether Hair Color Genius uses ModiFace and how it decides "need to bleach".
- Current status of Clairol MyShade, SalonLab, Coloright and Choicify.
- Paul Mitchell × YouCam date.
- Google hair-colour launch date (secondary sources only).
- Madison Reed total funding (reports vary: about $130M on an aggregator vs about $220–250M in press).
- Perfect Corp brand-client count (secondary summary).
- Assignees of US10863816 and the Kubelka-Munk conversion patent family.
- Bokaris et al. affiliation.
- iGEM HUST-China details (page 403).
