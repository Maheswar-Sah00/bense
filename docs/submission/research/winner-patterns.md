# How winning Devpost submissions are written

Research date: 2026-10-16. I studied 27 winning Devpost submissions from 20 hackathons (2024–2026). I fetched each Devpost page with curl and parsed it. For each video I fetched the YouTube watch page to get its length, description and chapters, and I downloaded the YouTube storyboard frames (one frame every 1–2 s). I read the visual structure and any burned-in captions from those frames.

**How to read this file**
- **Quotes:** Text in quotation marks is copied from the source. The only change is whitespace collapsed from HTML. Video quotes come from captions burned into the frames, so a quote is included only where the frame was legible.
- **Limits:** YouTube transcripts and audio could not be fetched, because the caption API returned empty. So voice-over wording, music and pacing are **not** assessed unless a caption or description shows them. Demo-share percentages are estimates read from the storyboards.
- **Word counts:** Word counts cover the story body only. The tagline, gallery and "Built with" list are excluded.
- **Not covered:** Some hackathons are not on Devpost or could not be found there:
  - The Gemini API Developer Competition (2024) was judged on Google's own site, not Devpost, so it is not included.
  - I found no Microsoft or Meta Llama hackathon galleries under the Devpost subdomains I tried.
- **Comparison set:** For contrast I also read 8 non-winning entries from the same YouCam hackathon. They are listed in §B1.

---

## Part A. Per-submission records

Field key: **H** hackathon / place · **URL** · **Tag** tagline (exact) · **Open** opening sentences (exact) · **Sections** headings in order · **Words** · **Story** · **Stats** · **Tech** · **Tone** · **Gallery** · **Video** · **Thumb**

### A1. Aloud (YouCam API Skin AI & Apparel VTO Hackathon, 2026). 1st Place
- **URL:** https://devpost.com/software/aloud-lxqr70
- **Tag:** "Beauty, aloud. The first beauty AI a blind shopper can use alone, screen off. Built on the YouCam Skin Analysis API."
- **Open:** "Skincare commerce is built on pictures. Product images, ingredient panels, and shade swatches are frequently unavailable to a screen reader, so a blind shopper cannot independently learn what a product is, what is in it, or whether it suits them. This is not a niche annoyance."
- **Sections:** The problem, in retail terms / What it does (four flows, all operable with the screen off) / How we used the YouCam API (Technological Implementation) / Why it is safe (and why that matters for retail) / Impact / Try it
- **Words:** ~800.
- **Story:** No personal story. It is framed entirely as a retail and legal problem. The emotional beat comes at the end: "For the shopper, it is independence: completing the decision alone."
- **Stats:** Roughly 12 numbers, all in the first section and every one sourced inline in parentheses:
  - "(Sephora 2017, Fenty Beauty 2019, Ulta 2019)"
  - "5,114 ADA digital-accessibility suits were filed in 2025"
  - "8.5 million Americans are blind or have serious difficulty seeing (2024 ACS)"
  - "iOS is 70.6 percent of screen-reader users"

  It quotes the sponsor's own numbers back to them: "Perfect Corp reports its beauty AI powers 800-plus brands, serves 300 million API calls a day, and lifts sales conversion 2.5x". It also has a measured result from its own testing: "10 of 10 attempts accepted by the analysis, every one under 30 seconds."
- **Tech:**
  - Explains the API at endpoint level: "registers the image (POST /s2s/v2.0/file/skin-analysis), uploads the bytes to the presigned URL, creates the task".
  - States a design principle: "wired end-to-end, not wrapped."
  - Includes a safety-engineering paragraph: "honesty is engineered, not hoped for."
- **Tone:** "We", declarative, no hype words, no em dashes. A hedge where needed: "as far as we can find, the first consumer skin tool that discloses its own accuracy bias".
- **Gallery:** 6 images. Each caption is a full sentence that says what the screen proves:
  - "Scan: the back camera finds the barcode by sound, so a blind shopper never has to aim at a target they cannot see. Typing it also works."
  - "Consent before the camera opens, in plain words: one photo, this session only, nothing saved, nothing about identity inferred."
- **Video:** 2:55 (175 s).
  - **Look:** Dark editorial style. No face cam (a face appears only inside the selfie-capture demo). Burned-in captions throughout.
  - **Cold open over a real phone shot of two bottles:** "Same size, same cap, same weight." / "One is lotion, one is cleanser." / "If you cannot see the label, the shelf goes silent."
  - **Stakes at 10–24 s:** "Eight and a half million Americans are blind or have serious difficulty seeing." / "Beauty retail has been sued over exactly this. Sephora. Fenty. Ulta." / "Over five thousand digital accessibility lawsuits in twenty twenty-five alone."
  - **Title at 26 s:** "This is Aloud."
  - **Demo:** About 37–150 s, roughly 60%, including the line "Now the part that should not be possible." and "And here is the part we are proudest of."
  - **Rest:** Under the hood at 132 s. Then web, iOS and Android, then the sponsor's own stat. It ends on a card with three QR codes.
  - **Chapters:** The YouTube description has chapters (0:00 Two bottles … 2:37 Try it). It also says: "Everything in this video is real: real products, real iPhone recordings, live production API calls … Every number in the narration traces to a documented source."
- **Thumb:** A dark card: "Beauty, aloud." with the line "SCREEN OFF · VOICE FIRST · YOUCAM SKIN AI".

### A2. ShadeSpan (YouCam API Hackathon, 2026). 2nd Place
- **URL:** https://devpost.com/software/shadespan
- **Tag:** "The same t-shirt is obvious on one customer and nearly invisible on another. ShadeSpan renders every garment on every skin tone with YouCam VTO and grades the colours that vanish — before launch."
- **Open:** "Look at almost any clothing website. Every item is photographed on one model. If your skin is a different shade from that model, you are guessing."
- **Sections:** Inspiration / What it does / Why point try-on at the catalogue instead of the shopper / How I built it / Getting the API working / Challenges we ran into / Accomplishments that we're proud of / What we learned / What's next for ShadeSpan
- **Words:** ~1,670.
- **Story:** A first-person reaction rather than a family story: "Here is the part that bothered me: brands almost never find out which garments are doing this."
- **Stats:** 4 market numbers, all in Inspiration and given without citation: "returned at 30–35%, roughly double the 19.3% e-commerce average. About 23% of returns are put down to style and colour". The rest are its own measured results:
  - "only 14.3% of garments hold a passing grade on all six tones. Two out of fourteen."
  - "84 photo shoots in about two minutes"
  - "Checked by eye against 14 cells, it agrees on 10."
- **Tech:**
  - Scoring formula with point weights ("Visibility (45 points)… Distinction (45 points)… Richness (10 points)").
  - API gotchas, for example "The apparel slug is cloth, not clothes. Anything else returns 404."
  - A frank failure story: "a photograph of a man in a black shirt. The try-on had quietly handed back the model's original clothing".
- **Tone:** First person singular. Short, plain sentences. British spelling. A memorable judgement line: "The average hides exactly the customer the tool exists to protect. So it is not used." It uses about 14 em dashes, yet still reads as human.
- **Gallery:** 6 images with short fragment captions:
  - "One t-shirt, two customers, one cannot see it"
  - "All 84 live renders, grades F to A along the bottom"
  - "The report a merchandising team gets"
- **Video:** 2:56.
  - **Format:** A browser screen recording of its own landing page and app. No face. No burned-in captions.
  - **Text hook at 0 s:** "The same t-shirt. Two customers. One of them can't see it."
  - **Chapters:** "00:00 The problem … 00:25 Why nobody catches it before launch … 00:57 What ShadeSpan does, and the whole catalogue graded … 01:35 Live demo … 02:30 A colour that passes, for contrast".
  - **Demo:** About 65% is results and demo.
  - **End card:** Name, a one-line descriptor and links.
- **Thumb:** The two-portrait comparison with the headline "One of them can't see it." and score labels.

### A3. CASTING (YouCam API Hackathon, 2026). 3rd–5th Place
- **URL:** https://devpost.com/software/casting
- **Tag:** "Show your customers someone who looks like them. One product photo, eight measured skin tones, one coverage score: CASTING tells a brand who its catalogue never shows. Built on four YouCam APIs."
- **Open:** "A brand photographs its product on two models. Its customers are everyone else. And nobody in the company can answer a simple question: who does our catalogue never show?"
- **Sections:** Inspiration / What it does / How we built it — four YouCam APIs, all load-bearing / Challenges we ran into / Accomplishments that we're proud of / What we learned / What's next for CASTING / Honesty — what is measured, what is curated
- **Words:** ~850.
- **Story:** None. The reframe is the hook: "We inverted it: CASTING's user is the brand".
- **Stats:** No market statistics. Only measured engineering numbers: "a single try-on takes 16.5–28.0s (measured)", "one live run costs 16 API units".
- **Tech:**
  - Lists each API with its role: "all load-bearing".
  - Describes honest failure states: "the UI reports '7 of 8 measured' instead of silently claiming success".
  - Ends with an explicit "Honesty" section that discloses AI-generated panel people and a fictional brand.
- **Tone:** "We". Uses many em dashes (about 21). Measured, technical voice.
- **Gallery:** 9 images. The first 3 have long captions, for example "What the product page shows today vs. what CASTING shows. MERIDIAN GOODS is fictional; its campaign images are AI-generated and labeled." The remaining 6 have no caption.
- **Video:** 2:21.
  - **0–46 s:** Two presenters speak to camera in a studio setting.
  - **Title card at 48 s:** Grid of eight people in the same red top.
  - **Product film:** Product-page reframe "Who does this product page never show?", then "Eight real, measured skin tones — not a gradient someone eyeballed.", then a live fan-out "Eight try-on calls. In parallel. In front of you." and "8 / 8 measured".
  - **Close:** "Stock what sells. To the people who actually walk in."
  - **Captions:** The video has uploaded (non-automatic) English captions.
- **Thumb:** The 8-person grid with a "CASTING" bar across it.

### A4. KeepMe (YouCam API Hackathon, 2026). 3rd–5th Place
- **URL:** https://devpost.com/software/keepme
- **Tag:** "KeepMe makes AI virtual try-on trustworthy. Shoppers control what can change, detect unwanted changes to their appearance, repair visual drift, and receive proof before approving the result."
- **Open:** "Virtual try-on should answer one simple question: "How does this garment look on me?" But a generative model can also change a shopper's glasses, face, hair, skin appearance, body outline, or background."
- **Sections:** The Devpost default template (Inspiration / What it does / How we built it / Challenges we ran into / Accomplishments that we're proud of / What we learned / What's next for KeepMe).
- **Words:** ~810.
- **Story:** None.
- **Stats:** None.
- **Tech:** A dense stack list (OpenCV, MediaPipe, ClamAV, JOSE/JWS, OpenTelemetry). It also discloses its demo setup: "The guided demo intentionally removes the shopper's glasses … without presenting the fixture as a fresh YouCam failure."
- **Tone:** "We". Calm. No hype. One key principle line: "consent should be specific enough for software to enforce."
- **Gallery:** 7 images, each with a one-sentence caption, for example "KeepMe catches the disclosed glasses-removal drift before the shopper can approve the result."
- **Video:** Hosted on Vimeo, so it was not analysed.
- **Thumb:** A light card: "KeepMe" plus the slogan "Change the clothes, not the person."

### A5. ConfidFit (YouCam API Hackathon, 2026). 3rd–5th Place
- **URL:** https://devpost.com/software/confidfit
- **Tag:** "ConfidFit adds YouCam generative apparel try-on to Shopify. Shoppers preview looks from a photo; merchants run a real product with metering, analytics, and honest labels."
- **Open:** "ConfidFit is a Shopify app for fashion brands. Shoppers open Try on on a product page, upload a photo, and get a generative apparel preview from Perfect Corp's YouCam Apparel VTO API (cloth-v3)."
- **Sections:** What this is / Why we built it / How it works (YouCam + Shopify) / What we learned / Challenges / Live proof
- **Words:** ~440.
- **Story:** None.
- **Stats:** None, and it says so deliberately: "No 'perfect fit,' no invented conversion percentages. Judges and merchants both notice when the copy overclaims."
- **Tech:** Request path in one line: "browser talks to Shopify App Proxy, then ConfidFit, then YouCam. API keys never go to the browser."
- **Tone:** Terse, product-like.
- **Gallery:** 5 images with no captions.
- **Video:** 0:50.
  - **Format:** UI walk-through with text cards. No face. Background music (the description credits "Wallpaper" by Kevin MacLeod, CC BY 4.0).
  - **Structure:** Title, then "How the product works" cards, then "Go live from a checklist", then a try-on on a real shopper photo, then analytics, then a green "Install free on Shopify" end card.
- **Thumb:** Green brand card plus a product photo.
- **Note:** It links a live Shopify App Store listing as "Live proof".

### A6. Second Voice (OpenAI Build Week, 2026). 1st Place, Apps for Your Life
- **URL:** https://devpost.com/software/second-voice-uk1peq
- **Tag:** "A zero-training AI communication aid that turns unclear speech from people with dysarthria into clear, confirmable sentences using GPT-5.6, then speaks them aloud."
- **Open:** "Dysarthria affects speech clarity for a huge range of people. Most ALS patients eventually develop it, along with over half of children with cerebral palsy and a large share of stroke and Parkinson's patients."
- **Sections:** Devpost default template.
- **Words:** ~380 (very short).
- **Story:** None in the text. The emotion is carried by the video.
- **Stats:** Soft, uncited proportions in the opening only. One competitor comparison: "Existing tools like Voiceitt ask users to record 50+ phrases before they even work."
- **Tech:** Three sentences. It says plainly which part is the model's job: "the sentence-level understanding and disambiguation is GPT-5.6's job."
- **Tone:** "We". Plain. It names the dignity principle: "never puts words in someone's mouth without their okay first."
- **Gallery:** 0 images, and no custom thumbnail (the Devpost default "D" shows).
- **Video:** 2:44. Dark style, burned-in captions, no face.
  - **Cold open, 0–14 s:** A waveform labelled "[a woman with dysarthria is speaking]", then "Did you understand her?" then "Neither did the machine." then the title "Second Voice / helping people be heard".
  - **Problem shown with real research recordings:** "[TORGO recording - mild dysarthria]" … "Severe. Almost nothing survives." then "Now imagine that at a pharmacy counter, or describing a symptom to your doctor."
  - **Product line:** "Second Voice. No voice training, no five hundred recorded phrases. Ready in about a minute."
  - **Demo:** "Local Whisper heard: He dresses himself in an ancient black fluff coat." then "Nothing is spoken automatically. She taps the sentence she meant. She is always the author." then "And when GPT-5.6 is not sure, it says so. No guess is ever spoken for her."
  - **Close:** "GPT-5.6 reconstructs. The human decides. … Dedicated to OpenAI Build Week." A source credit for the speech dataset follows.
  - **Shares:** Roughly 30% problem, 45% demo.
- **Thumb:** None (Devpost default).
- **Lesson:** A 380-word page with no gallery still won 1st, because the video carried the story.

### A7. veTriage (OpenAI Build Week, 2026). 1st Place, Work & Productivity
- **URL:** https://devpost.com/software/veterinary-four-color-triage-app
- **Tag:** "Built by a veterinarian & practice owner with no coding experience, this app turns clinical triage expertise into a structured safety net for vet clinic staff. Live now, screening all sick-pet calls."
- **Open:** It starts with links and an "Elevator pitch", then Inspiration: "Every sick-pet call begins with a pet and a worried person. The first person to hear the story is usually not a veterinarian. It is a receptionist."
- **Sections (abridged):** Inspiration / The cost of testing an unproven idea / What it does / The complete chain of care / What the staff member experiences / The RED emergency workflow / Documentation and safety / How we built it / What existed before July 13 / What changed during Build Week / … / I built it by talking / Staff became product partners / Challenges … / Accomplishments … / What we learned / … / A beautiful chain / What's next / Built at Paoli Vetcare, with gratitude
- **Words:** ~6,200 (an outlier).
- **Story:** The whole page is personal:
  - "My husband, Dr. Jay Rowan, has spent his career taking care of our clients"
  - "I was born in 1964. I had zero coding experience"
  - "I did not build veTriage because there was a competition. I entered the competition because I had already built veTriage."

  It tells one real incident with a careful disclaimer: "I would never claim that AI saved that dog. What I can say is that the system recognized urgency at a moment when recognizing urgency mattered." It also quotes a staff member: "I definitely think it's helpful."
- **Stats:** Few, and all first-hand:
  - Cost estimate "$32,000–$91,000 upfront"
  - "79 automated checks"
  - Dated adoption timeline ("By Tuesday, July 14 … By Monday, July 20")
- **Tech:** Deliberately low-AI at runtime: "The live app intentionally does not ask an LLM to interpret each case." It explains which tool did what (GPT-5.6 for reasoning, Codex for code, Sites for deployment).
- **Tone:** First person, warm. Very short paragraphs, several of them one line ("It was not."). It uses repetition for emphasis.
- **Gallery:** 15 images with title-style captions, for example:
  - "veTriage — Now Live on the Paoli Vetcare Reception Desk"
  - "veTriage — Dr. Rowan reviewing the ORANGE recommendation before calling pet owner"
  - "Family of veTriage creator — …"

  Real staff appear in real use.
- **Video:** 2:34. A single shot of two staff members talking to camera at the hospital reception desk, with the app on a monitor behind them. There is no screen recording in the sampled frames. All testimony, no demo.
- **Thumb:** Photo of a vet holding a dog, plus the logo and "for the moments that matter most".

### A8. Nested (Google AI Hackathon, 2024). First Place Overall
- **URL:** https://devpost.com/software/nested
- **Tag:** "Nested: Move to a new city with ease, assisted by tailored suggestions based on your lifestyle and Google Maps history—find nearby grocery stores, gyms, museums, and more!"
- **Open:** "27 million people move to cities every year in the US, and moving is listed as one of the top 5 most stressful life events according to verywellmind.com. Each of our team members has moved in the past year, and we all felt overwhelmed as we not only had to move our stuff, but also move our habits and routines."
- **Sections:** Devpost default template.
- **Words:** ~1,250.
- **Story:** A shared team experience ("Each of our team members has moved in the past year") in sentence 2, after the statistic. Concrete questions follow: "where should I buy groceries, where will I get my haircut, what doctor should we see".
- **Stats:** 2 numbers, both in the first sentence, with the source named in the text.
- **Tech:** Process narrative (prompt A/B testing, then onboarding, then "My Nest"). Handles errors with a retry ("'Deadline Exceeded', 'Resource Overloaded'").
- **Tone:** "We". Some boilerplate ("seamless" twice, "almost magical", "invaluable insights"). A 2024 entry, before these words became an AI tell.
- **Gallery:** 4 images with label captions ("Analyzing Google Maps Data", "Onboarding Flow", "Explore Page", "Saved Places").
- **Video:** 2:41.
  - **Opening b-roll:** City streets, a person unpacking boxes, with on-screen stats "27 Million People (2023 US)" and "Top 5 most stressful life events – verywellmind.com" (the source is cited on screen).
  - **Middle:** Logo at about 30 s. Demo from 42 to 148 s, about 65%. A Google-tech logo wall.
  - **Close:** A personal b-roll shot, then the end logo.
- **Thumb:** Logo plus "Move with ease".

### A9. Globot (Gemini 3 Hackathon, 2026). Grand Prize
- **URL:** https://devpost.com/software/globot-341w9q
- **Tag:** "Multi-Agents. 2M-token compliance analysis. Satellite imagery risk detection. Globot turns sudden supply chain chaos into confident decisions in 60 seconds."
- **Open:** "On a Friday at 4:55 PM, the Red Sea crisis erupts. You're responsible for $50 million in cargo, drowning in Excel spreadsheets while Reuters updates flood in. Your boss is yelling. What do you do?"
- **Sections:** Devpost default template.
- **Words:** ~330.
- **Story:** A second-person scenario ("You're responsible…"), not a personal story.
- **Stats:** Scenario numbers ($50 million, +$180K, 500-page, "6 hours before official announcements"). None are cited.
- **Tech:** An emoji bullet list of the 5 agents, then a stack list.
- **Tone:** Punchy and marketing-like. Contains "First supply chain AI to use satellite imagery for early warning" (an unhedged "first").
- **Gallery:** 19 images with label captions ("Choose Ports", "Human On The Loop", "Token usage management"). Six of them are all captioned "Homepage Introduction".
- **Video:** 2:26. Pure screen recording: the landing page (including a pricing page), then a mission-control map. No face and no visible captions.
- **Thumb:** A glowing globe shield, "GLOBAL TRADE GUARDIANS".

### A10. Storytopia (Google Cloud Run Hackathon, 2025). Grand Prize
- **URL:** https://devpost.com/software/storytopia-bu917p
- **Tag:** "Making screen time less passive - and more creative."
- **Open:** "Kids spend more time than ever in front of screens – but not enough time using them to create. Passive content consumption make them audiences, not authors of their own ideas."
- **Sections:** (untitled intro) / How Storytopia works / Cloud Deployment Surfaces / How Our Multi-Agent Workflow Works / Google ADK Integration / 1. Creating Your Character… / 2. Turning the Character into a Quest… / 3. Bringing the Story to Life… / 4. Adding Narration (Optional) / Try it out! / Future Improvements
- **Words:** ~1,020.
- **Story:** None. A crisp contrast instead: "audiences, not authors".
- **Stats:** None in the problem section. Honest runtime notes: "Character generation: ~15 seconds", "Quest generation: ~2.5 minutes", "demo video and GIF examples are sped up".
- **Tech:** Step-by-step walk through each agent and the data passed between them. Includes an architecture figure.
- **Tone:** "We", clear. It admits cost limits ("found it to be quite costly").
- **Gallery:** 1 image.
- **Video:** 2:52.
  - **0–14 s:** Illustrated title card with "Turn your kid's drawings into personalized, interactive stories!"
  - **Demo, 18–145 s (about 75%):** A child-style drawing becomes a character, then a lesson is picked, then the illustrated quest plays.
  - **Close:** Architecture diagram, then the title card again. The description notes it is sped up.
- **Thumb:** Title, subtitle and a laptop mock-up on an illustrated forest background.

### A11. SalesShortcut (Agent Development Kit Hackathon with Google Cloud, 2025). Grand Prize
- **URL:** https://devpost.com/software/salesshortcut
- **Tag:** "A comprehensive AI-powered Sales Development Representative (SDR) system built with multi-agent architecture for automated lead generation, research, proposal generation, and outreach."
- **Open:** "The idea for SalesShortcut came from a real-world problem we witnessed firsthand. A friend of ours was working as a freelance developer, and he partnered with a sales-savvy friend to generate new business."
- **Sections:** 🚀 SalesShortcut Hackathon Journey / Inspiration / What it does / How we built it / 🏗️ Architecture & Scale / 🛠️ Technology Stack / Challenges… (4 emoji sub-heads) / Accomplishments… / What we learned / What's next… / Bonuses
- **Words:** ~1,240.
- **Story:** A friend's manual cold-calling grind, opening the page: "It was a classic, manual grind. … We thought, 'There has to be a better way.'"
- **Stats:** No market stats. Architecture counts instead: "34 distinct agents (21 LLMAgents, 7 Sequential Agents…)", "5 microservices".
- **Tech:** Counts and named patterns ("Review/Critique, Iterative Refinement, Parallel Fan-Out/Gather").
- **Tone:** Enthusiastic. Many emoji, plus "cutting-edge", "game-changer", "seamlessly" and "incredible". It explicitly lists judging bonuses (a contribution to the ADK open-source repo, blog posts).
- **Gallery:** 1 architecture image.
- **Video:** 4:53 (long).
  - **Opening:** Two team members on face cam (0–6 s).
  - **Highlight:** A team member answers a live phone call placed by the AI agent, on camera (42–72 s, with a "speed up.." caption).
  - **Close:** About 50 s of architecture diagrams.
- **Thumb:** A rocket logo with "HACKATHON JOURNEY".

### A12. Nutshell (Google Chrome Built-in AI Challenge, 2025). Most Helpful, Chrome Extension
- **URL:** https://devpost.com/software/nutshell-auftp2
- **Tag:** "Empowers users with motor disabilities to browse the web completely hands-free using just their head and mouth movements, powered by Chrome's private, on-device AI."
- **Open:** "The web is humanity's greatest library, but for millions with motor disabilities, the simple act of clicking a link is a monumental barrier. I was inspired by the question: How can we build a more helpful and accessible web for everyone?"
- **Sections:** Devpost default template, with "I" wording.
- **Words:** ~1,650.
- **Story:** None personal. The prompt is a question that echoes the prize category name ("helpful").
- **Stats:** Engineering parameters only ("800ms cooldown", "45px radius", "min cutoff: 0.4"). It includes LaTeX equations for the One-Euro filter.
- **Tech:** Very deep, with algorithm-level detail.
- **Tone:** First person, with some grand phrasing ("revolutionary opportunity", "life-changing accessibility", "seamlessly").
- **Gallery:** 8 images with label captions ("Head Tracking Calibration", "Mouth Click Calibration").
- **Video:** 2:55.
  - **0–46 s:** The founder talks to camera (a mascot pops in).
  - **48–155 s:** Demo with a webcam picture-in-picture, which matters because the head is the input.
  - **156–175 s:** Back to the founder for the close.
- **Thumb:** Acorn mascot "NUTSHELL".

### A13. AAC Board AI (Google Chrome Built-in AI Challenge, 2025). Most Helpful, Web Application
- **URL:** https://devpost.com/software/aac-board-ai
- **Tag:** "AAC Board AI is a local-first communication board for people who cannot rely on speech. It works with or without AI, using Chrome's on-device models to proofread, rephrase, and translate privately."
- **Open:** It starts with "Source code: github.com/shayc/aac-board-ai" and a "Recent updates" list, then Inspiration: "Communication is a basic human need, yet for people who can't rely on speech, even building a short sentence can take immense effort."
- **Sections:** Recent updates / Inspiration / What it does / How we built it / Challenges / Accomplishments / What we learned / What's next (with sub-heads).
- **Words:** ~490.
- **Story:** None.
- **Stats:** One honest internal measure: the Prompt API "worked about 80% of the time … the remaining 20% produced illogical results ('I eat ocean'). For an assistive communication tool, that margin of error is too high."
- **Tech:** Concrete stack (React 19, Zod, Open Board Format importer).
- **Tone:** Restrained, first person. It shows a concrete before and after: "'I want go grandma' … ('I want to go to Grandma's')".
- **Gallery:** 1 image.
- **Video:** 3:27.
  - **0–16 s:** Face cam with a lower-third name, "Shay - AAC Board AI".
  - **18–166 s:** Demo of the pictogram grid, about 72%.
  - **168–207 s:** Face cam for the close.
- **Thumb:** A screenshot of the pictogram board.

### A14. Mochi (Google Chrome Built-in AI Challenge, 2024). Best 'Real-World' App, Chrome Extension
- **URL:** https://devpost.com/software/mochi-6i7vuk
- **Tag:** "Mochi is a Chrome extension that adapts web content for users with reading disabilities, ADHD, and dyslexia. Like its namesake, it makes hard-to-read content softer and more digestible."
- **Open:** "Imagine trying to read a complex article when your brain processes text differently than others. For millions of people with reading disabilities, ADHD, and dyslexia, this isn't just an exercise - it's a daily challenge."
- **Sections:** Inspiration / What it does / How I built it / Challenges and Breakthroughs / Impact and Future / Technical Innovation
- **Words:** ~530.
- **Story:** None. The name metaphor carries the warmth.
- **Stats:** Only "millions" (vague).
- **Tech:** Thin; mostly claims ("sophisticated yet privacy-first architecture").
- **Tone:** Marketing-heavy ("revolutionizes", "magic", "seamlessly", "cutting-edge"). It has one thoughtful design note: "we've consciously avoided labels in the interface to prevent stigmatization."
- **Gallery:** 6 designed slides with captions ("Before and After", "Three Simplification Levels").
- **Video:** 2:50.
  - **Captions:** Burned-in throughout ("Hi! I'm excited to introduce you to").
  - **Layout:** Founder in a circular face bubble, motion-graphic intro, demo with the face bubble.
  - **Close:** Founder close: "Try Mochi today and experience web content in a way that works for you".
- **Thumb:** Mascot plus wordmark.

### A15. BackstageCommercials (Amazon Nova AI Hackathon, 2026). First Prize Overall
- **URL:** https://devpost.com/software/backstagecommercials
- **Tag:** "AI-integrated ads seamlessly embedded into the background."
- **Open:** "Advertising has always been a point of tension between streaming platforms and their users. Show too many ads, and viewers become frustrated; show too few, and platforms lose revenue."
- **Sections:** Inspiration / What it does / How we built it / Challenges we ran into / What's next
- **Words:** ~870.
- **Story:** A relatable observation rather than a personal story: "many people intentionally arrive 15–20 minutes after the scheduled start time to avoid pre-show ads". It then asks three "What if…" questions.
- **Stats:** Engineering constraints: "about 24 GB of VRAM … quantizing the model to 4-bit", "a single frame took 3 minutes".
- **Tech:**
  - A one-line pipeline: "select a scene -> identify a horizontal/flat surface … -> use Nova agents".
  - An adjuster/critic model pair explained in plain words.
- **Tone:** "We", clear. "Seamless" appears in the tagline and the body.
- **Gallery:** 0 images.
- **Video:** 2:07.
  - **Hook at 2–6 s:** Screenshots of real viewer comments ("I'm okay with ads IF they are properly placed." / "I've stopped watching prime, it got to be too much"), then the text "Properly placed?", then the title.
  - **Demo:** On TV-show footage, with animated "Adjuster" and "Critic" labels and a "QUIZ" interactive beat.
  - **End card:** "Future of commerce".
- **Thumb:** Logo on navy.

### A16. LLMIX (AWS Presents: Breaking Barriers Virtual Challenge, 2025). 1st Prize
- **URL:** https://devpost.com/software/llmix
- **Tag:** "LLMIX puts AI in offline communities: a Pi-powered hotspot with chat, code, med & wiki models—totally local. Flash the image, boot, connect to its Wi-Fi, and let multiple users learn, solve, thrive."
- **Open:** "LLMIX began with a simple, stubborn question: "What good is the AI revolution if half the planet can't reach it?" According to the ITU, 2.6 billion people still live without reliable internet."
- **Sections:** Inspiration / What We Built / What We Learned / Challenges We Faced
- **Words:** ~380.
- **Story:** None personal. One line of user voice: "Rural teachers asked for coding tutorials that don't need YouTube or ChatGPT."
- **Stats:** The ITU statistic, with its source named, in sentence 2. A benchmark result: "scores 55.82 % avg on Open Medical-LLM Leaderboard … topping the < 3 B leaderboard".
- **Tech:** Brief. The learnings are written as sayings: "Context is gold", "Streaming beats spinners".
- **Tone:** Punchy, with a human detail: "watching Medicanite inch past JSL-MedPhi2 at 3 AM was the caffeine we needed."
- **Gallery:** 1 image.
- **Video:** 4:40.
  - **Opening:** Title card, then two founders on camera in branded T-shirts.
  - **Middle:** Stock b-roll (classrooms, clinics, Earth at night), then the physical product, then flashing the SD card, then "SSID: LLMIX" Wi-Fi join, then the app demo and code.
  - **Close:** More b-roll, the founders again, and an end card "Created on the AWS Cloud to serve offline communities".
- **Thumb:** Monochrome logo.

### A17. Upload Drive-In (Code with Kiro Hackathon, 2025). 1st Place (plus Bonus Blog Prize)
- **URL:** https://devpost.com/software/upload-drive-in
- **Tag:** "Upload Drive-In is a self-hosted web service that makes accepting files of any size for your organization an easy and robust process for both your team and your clients."
- **Open:** "File sharing is supposed to be simple, but in reality, it often feels messy and complicated. I've seen clients struggle with ad-hoc solutions, like emailing large attachments, dealing with clunky FTP servers, or wrangling with permissions in cloud drives."
- **Sections:** Devpost default template, with "I" wording.
- **Words:** ~815.
- **Story:** Professional and first-hand: "I've seen clients struggle". There is self-deprecating candour: "I want to make the design of the app look less bootstrappy, but I'm a functionality-first person … C'est la vie."
- **Stats:** No market stats. One time claim: "It took several weeks of work with Kiro. It would have taken many months without Kiro."
- **Tech:** Plain (Laravel, OAuth 2.0, chunked uploads, DDEV, Forge). It names the sponsor tool's role in each challenge.
- **Tone:** First person, conversational, honest about regrets ("I should have trashed that version entirely").
- **Gallery:** 10 images with full-sentence captions, for example "The security page let's the admin control who can use the app. This example shows only myclient.com users can share files."
- **Video:** 1:56.
  - **1–8 s:** Founder face with a lower third ("John Morton, Morton Studio LLC").
  - **9–14 s:** Real, redacted client emails as proof of the problem ("I can't download these files…").
  - **Middle:** Logo, then screens. A kinetic text card: "IT TOOK ME ABOUT 6 WEEKS. INSTEAD OF 1.5 YEARS." and "IDEA + DEVELOPER + KIRO = APP".
  - **Close:** Logo. The description has timestamped chapters.
- **Thumb:** Logo.

### A18. Tailored Labs (World's Largest Hackathon presented by Bolt, 2025). Grand Prize
- **URL:** https://devpost.com/software/civilink
- **Tag:** "AI-powered video timeline editor that lets creators build professional edits through natural language commands, perfectly analyze raw video, and outputs end to end "one-shot" video generation."
- **Open:** "Building Bolt.new for Video Editing. Manually editing your professional video takes HOURS of sifting through edits and raw video! Then you have to clip it, then you have to arrange it, then you have to ..... you get it."
- **Sections:** Inspiration 🎬✨ / What it does 🚀 / How we built it 🛠️
- **Words:** ~315 (it ends mid code-block).
- **Story:** A personal "aha!" moment.
- **Stats:** None.
- **Tech:** An emoji stack list ("Stripe – Because even AI assistants need to eat (electricity)").
- **Tone:** Loud and playful (caps, emoji).
- **Gallery:** 0 images.
- **Video:** 2:55.
  - **2–42 s:** A skit of a frustrated creator at a laptop (head in hands).
  - **48–72 s:** The founder, in a suit outdoors, pitches to camera.
  - **78–160 s:** Demo, about 47%.
  - **162–175 s:** The founder closes.
- **Thumb:** App screenshot.

### A19. Vonar.ai (Perplexity Hackathon, 2025). First Place
- **URL:** https://devpost.com/software/vonar-ai
- **Tag:** "Vonar.ai is an AI-powered voice agent that answers inbound calls, handles support requests, and instantly finds answers using real-time search — all without a human."
- **Open:** "We were frustrated by how bad most inbound call experiences are — long wait times, robotic phone trees, and irrelevant answers. At the same time, most businesses don't have the resources to build a full AI voice stack."
- **Sections:** Emoji-prefixed default sections, separated by "⸻".
- **Words:** ~540.
- **Story:** Shared frustration.
- **Stats:** One learning: "even 500ms of lag ruins the experience".
- **Tech:** Bullets (Vapi, Llama 4 via Groq, Sonar Pro as a tool).
- **Tone:** Informal ("snappy as hell").
- **Gallery:** 1 image.
- **Video:** 3:02. A screen recording with the founder's face in a circle overlay throughout. A live call demo.
- **Thumb:** The landing-page hero.

### A20. Baymax, Your Personal Healthcare Companion (TreeHacks 2024). Grand Prize ($10k)
- **URL:** https://devpost.com/software/baymax-your-personal-healthcare-companion
- **Tag:** "Our AI-powered robot arm is a personalized solution to restore physically impaired and elderly individuals' ability to interact with their environment."
- **Open:** "40 million people in the world are blind, including 20% of all people aged 85 or older. Half a million people suffer paralyzing spinal cord injuries every year. 8.5 million people are affected by Parkinson's disease, with the vast majority of these being senior citizens."
- **Sections:** Devpost default template.
- **Words:** ~1,140.
- **Story:** None personal. "its loved one" framing.
- **Stats:** Three uncited statistics stacked in the first three sentences.
- **Tech:** Custom inverse kinematics, keyframe animation, 3 CNNs. Problems are explained along with their fixes.
- **Tone:** "We". Some overstatement ("eternally diligent", "anything is possible") alongside humour ("not eating our hi-chews we were using for testing!").
- **Gallery:** 3 photos with no captions.
- **Video:** 1:48. A single continuous take of a user asking for medicine while the arm picks it up and feeds it. 100% live demo, no edits or narration overlays visible.
- **Thumb:** "Here are millions of people that Baymax can help" plus a photo of the arm.

### A21. HawkWatch (TreeHacks 2025). Grand Prize, 1st Place ($11k)
- **URL:** https://devpost.com/software/hawkwatch
- **Tag:** "Transform any camera into a smart security system with HawkWatch. Our AI VLM instantly detects and alerts security to potential threats, giving businesses of all sizes a peace of mind."
- **Open:** "In an era where security cameras are everywhere but meaningful surveillance is scarce, we saw an opportunity to transform passive recording systems into intelligent security guardians."
- **Sections:** HawkWatch - AI-Powered Security Surveillance / Inspiration / What it does / Additional features / How we built it / Challenges / Accomplishments / What we learned / What's next (3 numbered sub-heads)
- **Words:** ~700.
- **Story:** None.
- **Stats:** None in the text. They appear in the video instead.
- **Tech:** A stack list.
- **Tone:** Generic ("seamless", "robust").
- **Gallery:** 6 images. The captions mix a joke ("Our amazing landing page!! :D") with a strong evidence caption ("Real-time security streaming capturing man who fainted [Gemini + TensorFlow]").
- **Video:** 2:00.
  - **Opening:** The team of four on camera, with captions: "Hi! We're four tree hackers, and for Treehacks 2025 we made Hawkwatch!" then "So businesses lose over $35 million per day" and "and 44% of those losses are due to shoplifting" (by 12 s), then "Looking at this problem we developed Hawkwatch".
  - **Demo:** A dashboard with a face picture-in-picture, including a staged "unconscious" event.
- **Thumb:** Hawk logo.

### A22. Shepherd (TreeHacks 2026). Grand Prize (1st) and Healthcare Track Grand Prize
- **URL:** https://devpost.com/software/raising-cane
- **Tag:** "A smart cane that guides indoor and outdoor navigation for blind people, costing ~1/20 of existing devices and providing better guidance."
- **Open:** "1.7 million Americans are legally blind. While canes tell you something is there, they don't tell you where to go. Smart canes actively steer you around obstacles, but they're prohibitively expensive and inaccessible."
- **Sections:** Devpost default template.
- **Words:** ~940.
- **Story:** None personal. It has the sharpest problem line in the set: "canes tell you something is there, they don't tell you where to go."
- **Stats:**
  - One uncited statistic (opening), plus a cost ratio in the tagline.
  - Many measured numbers: "60fps", "12-byte BLE packet … every 100ms", "End-to-end latency … under 50ms", "five major rewrites".
- **Tech:** Exceptionally concrete. Every problem is paired with its fix (hallway oscillation solved with gap-seeking; a motor watchdog).
- **Tone:** "We". Plain, witty and confident: "It's dumb and it works." / "The steering actually feels good. Not jerky, not laggy". Zero hype words.
- **Gallery:** 23 build photos with short label captions ("Haptic feedback system pre-electrical tape", "Omni-wheel and Shrek shoes", "Us with Shepherd post demo-vid filming").
- **Video:** 2:27.
  - **Cold open:** Shoes, then the title "Shepherd" over a blindfolded tester walking with the cane at night on campus.
  - **Body:** Mostly real-world footage of the product in use, with brief team-at-bench, map UI, CAD and hardware close-ups (66–114 s).
  - **Close:** The tester celebrating. There is no slide deck.
- **Thumb:** A CAD render of the cane.

### A23. Duet: Brainwaves -> Live Music (Cal Hacks 11.0, 2024). 1st Overall
- **URL:** https://devpost.com/software/duet-0tbkxe
- **Tag:** "Creativity is inherent, but expressing it is hard. Duet reads live brainwaves via EEG and uses AI to generate evolving soundscapes that reflect your emotions, giving voice to your inner symphony."
- **Open:** "Duet's music generation revolutionizes how we approach music therapy. We capture real-time brainwave data using Emotiv EEG technology, translating it into dynamic, personalized soundscapes live."
- **Sections:** A single "About the project" heading, with bold pseudo-headings (Inspiration, What it does, How we built it, Challenges, What's next).
- **Words:** ~830.
- **Story:** Team expertise as the origin: "Daniel and Justin have extensive experience teaching music to children, but working with those who have developmental disabilities presents unique challenges". It adds a playful build detail: "After trying it out on ourselves, the CalHacks stuffed bear, and the Ariana Grande cutout".
- **Stats:** "approximately 1 in 10 in the United States" and "a projected growth rate of 15.59% in the music therapy sector". Both uncited.
- **Tech:** A narrative explaining why their approach is new ("what if we could have an AI be a live 'composer'"), hedged with "to our knowledge".
- **Tone:** Mixed. Hype ("revolutionizes" twice) next to honest struggle ("We originally thought it was impossible").
- **Gallery:** 4 photos with no captions.
- **Video:** 3:41.
  - **Opening:** A title card with webcam picture-in-picture and the note "*Background music is generated brain wave music!".
  - **Middle:** A real-life demo with a user wearing the EEG (42–130 s), then about 80 s on a "How Duet Works" diagram slide.
  - **Close:** "Come find your creative self with Duet".
- **Thumb:** A photo of a user wearing the EEG.

### A24. FaceTimeOS: AI Mac Agent (Cal Hacks 12.0, 2025). 1st Overall
- **URL:** https://devpost.com/software/facetime-macos-ai-agent
- **Tag:** "FaceTime to talk, see, and control your Macbook with AI Agents"
- **Open:** "Have you ever gone to the gym and forgotten to train your Hugging Face model? Have you ever wanted to show a friend your most recent Fortnite clip, but the file was stuck on your Mac?"
- **Sections:** Devpost default template.
- **Words:** ~960.
- **Story:** Relatable, funny scenarios rather than a personal story.
- **Stats:** None.
- **Tech:** The hack is explained clearly: "We used Fish Audio to create a virtual microphone and speaker on the Mac".
- **Tone:** "We", lively; "felt like magic".
- **Gallery:** 3 images with no captions.
- **Video:** 2:02.
  - **0–22 s:** Three founders on a couch, with captions: "Sometimes you need to do something on your computer" / "But you're already outside and it's too late to go back" / "What if you could control your computer from anywhere in the world?" / "We built a multimodal agent with full control of your computer" / "So instead of calling your Mom to debug your CUDA errors," / "You can just FaceTime the Mac instead."
  - **24–72 s:** Phone demo.
  - **72–110 s:** Code.
  - **Close:** A founder using it from a car, as real-world proof.
- **Thumb:** A photo of the founder on a FaceTime call with the Mac.

### A25. SoundShield (PennApps XXV, 2024). Best Overall 1st
- **URL:** https://devpost.com/software/soundsheild
- **Tag:** "A wearable headphone that dynamically adapts audio for individuals with autism, providing comfort while keeping users connected to their surroundings."
- **Open:** "Noise sensitivity is common in autism, but it can also affect individuals without autism. Research shows that 50 to 70 percent of people with autism experience hypersensitivity to everyday sounds."
- **Sections:** Devpost default template.
- **Words:** ~550.
- **Story:** None.
- **Stats:** One statistic, attributed only to "Research shows".
- **Tech:** Plain (spectral subtraction, Raspberry Pi Zero).
- **Tone:** "We", earnest. "Most importantly, we deepened our understanding of the sensory challenges faced by individuals with autism".
- **Gallery:** 8 images with no captions.
- **Video:** 2:07. The founder talks to camera in a hallway while holding the prototype. He puts it on, a debug-metrics overlay appears, then a second team member tries it. Hardware in hand the whole time.
- **Thumb:** A photo of the hacked headphones.

### A26. kinemo (PennApps XXVI, 2025). 1st Place Overall
- **URL:** https://devpost.com/software/kinemo
- **Tag:** "A party game where your body is the controller!"
- **Open:** "We started off making a boxing motion tracker with the intention of creating real-time AI feedback. It slowly evolved into feeling more like a game, so we decided to work towards that instead."
- **Sections:** Devpost default template.
- **Words:** ~520.
- **Story:** A team-origin story. The proof is other people playing: "our greatest accomplishment of the weekend was seeing people's eyes light up as they faced off against their friends".
- **Stats:** Only game rules ("12 hearts", "0.75 seconds").
- **Tech:** One paragraph.
- **Tone:** Casual and happy ("Our makeshift team").
- **Gallery:** 9 photos with friendly captions ("Another group trying out boxing!", "Our team photo!").
- **Video:** 1:00. An energetic montage: running down a hallway into a classroom, people boxing, game screens, then the logo. Social proof over explanation.
- **Thumb:** A pixel-font logo.

### A27. gibber link (ElevenLabs x a16z Worldwide Hackathon, London, 2025). Winner (prize: TP-7 and Mac Mini per member)
- **URL:** https://devpost.com/software/gibber-link
- **Tag:** "Communication protocol for optimized AI agent - AI agent communication over phone"
- **Open:** "Today, more and more AI agents make phone calls. Also, more and more AI agents take phone calls. Inevitably, AI agent would have to talk to AI agent over the phone."
- **Sections:** Inefficient Communication / The protocol / Impact
- **Words:** ~190.
- **Story:** None.
- **Stats:** Two claims in Impact ("90%+ of compute costs", "up to 80%" time), uncited.
- **Tech:** Three bullets.
- **Tone:** Minimal; the logic is inevitable.
- **Gallery:** 1 image.
- **Video:** 1:10. One static shot of a laptop and a phone. Two AI agents talk, with subtitles: "Thanks for calling Leonardo Hotel. How can I help you today?" / "Hi there, I'm an AI agent calling on behalf of Boris Starkov." / "Oh, hello there! I'm actually an AI assistant too." Then they switch to data-over-sound. No narration, no title. The YouTube title does the hook: "Two AI agents on a phone call realize they're both AI and switch to a superior audio signal ggwave".
- **Thumb:** The same laptop and phone still.

---

## Part B. Synthesis

### B1. Common structure: winners vs typical entries

**What nearly everyone does (winners and non-winners alike).** About 20 of the 27 winners keep Devpost's default headings (Inspiration / What it does / How we built it / Challenges / Accomplishments / What we learned / What's next). The template is not what separates winners from the rest.

**What the winners do differently**

1. **The first section is a sharp problem, not a feature list.** The strongest winners open on a specific, checkable gap:
   - "canes tell you something is there, they don't tell you where to go" (Shepherd)
   - "If you cannot see the label, the shelf goes silent." (Aloud video)
   - "who does our catalogue never show?" (CASTING)
   - "Every item is photographed on one model." (ShadeSpan)

   The non-winners from the same YouCam event open on a general wish:
   - "Skincare is often based on guesswork." (Skin Journey)
   - "Online fashion shopping often involves guesswork." (Wearwise)
   - "Choosing an outfit is more than finding something that looks good on a model." (Drape)
2. **They reframe who the user is.** Three of the five YouCam winners point the sponsor API at an unexpected user:
   - Aloud: a blind shopper.
   - ShadeSpan: "Same API, opposite end of the funnel".
   - CASTING: "We inverted it: CASTING's user is the brand".

   The typical entries build the obvious consumer selfie or try-on app (Muse, Drape, Wearwise, Atelier, GlowCycle, Skin Journey).
3. **Custom headings that argue.** The top YouCam entries rename or add sections so the headings make the case on their own:
   - "The problem, in retail terms"
   - "Why it is safe (and why that matters for retail)"
   - "Why point try-on at the catalogue instead of the shopper"
   - "Getting the API working"
   - "Honesty — what is measured, what is curated"
   - "Live proof"

   Several of these map directly onto judging criteria, for example Aloud's "How we used the YouCam API (Technological Implementation)".
4. **Integration depth is shown, not claimed.** They give endpoint paths, payload fields, gotchas, costs per call and measured latencies (Aloud, ShadeSpan, CASTING, Shepherd). Typical entries say "powered by the YouCam API".
5. **Honest limits are a feature.** Examples:
   - ConfidFit: "No 'perfect fit,' no invented conversion percentages."
   - ShadeSpan: "drift is reported, never scored".
   - AAC Board AI: the 80/20 Prompt API result.
   - KeepMe: the disclosed synthetic fixture.
   - Storytopia: "demo video and GIF examples are sped up".
   - veTriage: "I would never claim that AI saved that dog."

   In the 2026 YouCam set, every top-5 entry has at least one explicit limitation or disclosure.
6. **Proof that it is real.** They give live URLs, a TestFlight/APK/App Store listing ("Try it", "Live proof"), staff in real use (veTriage), and people at the event playing it (kinemo).
7. **Length doesn't separate them.** Winners range from 187 words (gibber link) to 6,200 (veTriage). The median is about 800. Short pages win when the video is strong (Second Voice, gibber link, Globot).
8. **Video carries more weight than text in some wins.** Second Voice (380 words, 0 images, no thumbnail) and gibber link (187 words) won on the video. Devpost's judges say the video is often reviewed first.

**Counter-examples, so you don't over-learn.** Several older college-hackathon winners use generic, hype-laden prose and still won on the build (Baymax, HawkWatch, Duet, Mochi, SalesShortcut). Netra placed 3rd in the Gemini 3 Hackathon despite opening with "NETRA: The Definitive Submission for the Gemini 3 Grand Prize / A Note to the Judges: On Recognizing the Winning Project". So prose style is a tiebreaker, not a substitute for a working build. Among the 2026 sponsor-API winners, though, the restrained, evidence-led style dominates.

### B2. Opening-line patterns that work (real examples)

| Pattern | Example (exact) |
|---|---|
| Concrete contrast pair | "Two bottles. Same size, same cap, same weight. One is lotion, one is cleanser." (Aloud video) |
| Stat, then the gap the stat hides | "1.7 million Americans are legally blind. While canes tell you something is there, they don't tell you where to go." (Shepherd) |
| Observable fact the reader can verify | "Look at almost any clothing website. Every item is photographed on one model." (ShadeSpan) |
| Three-beat setup ending in an uncomfortable question | "A brand photographs its product on two models. Its customers are everyone else. And nobody in the company can answer a simple question: who does our catalogue never show?" (CASTING) |
| Put the judge in the user's shoes | "Did you understand her?" / "Neither did the machine." (Second Voice video) |
| Second-person crisis scene | "On a Friday at 4:55 PM, the Red Sea crisis erupts. You're responsible for $50 million in cargo…" (Globot) |
| Funny relatable question | "Have you ever gone to the gym and forgotten to train your Hugging Face model?" (FaceTimeOS) |
| Who first meets the problem | "Every sick-pet call begins with a pet and a worried person. The first person to hear the story is usually not a veterinarian. It is a receptionist." (veTriage) |
| Stubborn question plus cited stat | "LLMIX began with a simple, stubborn question: "What good is the AI revolution if half the planet can't reach it?" According to the ITU, 2.6 billion people still live without reliable internet." (LLMIX) |
| Inevitability logic | "Today, more and more AI agents make phone calls. Also, more and more AI agents take phone calls. Inevitably, AI agent would have to talk to AI agent over the phone." (gibber link) |
| Tight contrast slogan | "Passive content consumption make them audiences, not authors of their own ideas." (Storytopia) |

**Tagline patterns.** The best taglines name the user and the constraint and end with a proof or price:
- "The first beauty AI a blind shopper can use alone, screen off."
- "costing ~1/20 of existing devices"
- "Live now, screening all sick-pet calls."
- "grades the colours that vanish — before launch."

Weak taglines are generic ("Utilize YouCam's technologies to find your celebrity inspiration!") or apologetic. One non-winning YouCam tagline begins "I'm extremely sorry, sir."

### B3. Personal stories that don't sound fake (examples)

1. **Use specific people, places and dates, not "millions".** veTriage names the hospital (Paoli Vetcare), the husband ("Dr. Jay Rowan"), the staff (Courtney, Chelsie), dates ("By Tuesday, July 14") and the author's birth year ("I was born in 1964").
2. **Disclaim the tempting overclaim.** "I would never claim that AI saved that dog. What I can say is that the system recognized urgency at a moment when recognizing urgency mattered." (veTriage)
3. **Admit the unglamorous motive.** "I did not build veTriage because there was a competition. I entered the competition because I had already built veTriage."
4. **Use the team's real expertise as the origin.** "Daniel and Justin have extensive experience teaching music to children" (Duet). "I've seen clients struggle with ad-hoc solutions" (Upload Drive-In). "Each of our team members has moved in the past year" (Nested). "A friend of ours was working as a freelance developer" (SalesShortcut).
5. **Use first-person reaction instead of backstory.** "Here is the part that bothered me: brands almost never find out which garments are doing this." (ShadeSpan) It is one sentence: personal without biography.
6. **Show real people in the gallery and video.** veTriage's gallery shows staff using it, and its video is the staff speaking. kinemo's gallery is "Another group trying out boxing!". Shepherd ends with "Us with Shepherd post demo-vid filming".
7. **Quote the user's own words.** "She said it was "more efficient" … "I definitely think it's helpful."" (veTriage). Upload Drive-In's video shows real, redacted client emails. BackstageCommercials shows real viewer comments.
8. **Use self-deprecation and small human details.** "Let's not overlook the success of not eating our hi-chews" (Baymax). "watching Medicanite inch past JSL-MedPhi2 at 3 AM" (LLMIX). "Spot-welding was another timeless classic" (Shepherd). "C'est la vie." (Upload Drive-In)
9. **When you have no personal story, don't invent one.** Aloud, CASTING, KeepMe, ConfidFit, Second Voice, Shepherd and gibber link have no family anecdote and won anyway. They substitute a vivid concrete scene: the two bottles, the dysarthric voice sample, the blindfolded walk.

### B4. How statistics are placed (examples)

- **Front-load, then stop.** Most winners put all market statistics in the first paragraph (Nested, Baymax, Shepherd, LLMIX, SoundShield, Aloud) and use only their own measurements after that.
- **Cite inline, briefly.** Examples:
  - "(2024 ACS)"; "(Sephora 2017, Fenty Beauty 2019, Ulta 2019)" (Aloud)
  - "According to the ITU" (LLMIX)
  - "according to verywellmind.com" (Nested). Nested also puts the source on screen in the video.
- **Many winners don't cite.** Baymax, SoundShield ("Research shows"), Duet, HawkWatch (video only), Globot and gibber link give numbers with no source. The best-crafted 2026 entries cite everything. Aloud's video description says: "Every number in the narration traces to a documented source."
- **Your own measurements beat market statistics.** Examples:
  - "only 14.3% of garments hold a passing grade on all six tones. Two out of fourteen." (ShadeSpan; it pairs the percentage with a plain-language count)
  - "10 of 10 attempts accepted … every one under 30 seconds" (Aloud)
  - "End-to-end latency … under 50ms" (Shepherd)
  - "16.5–28.0s (measured)" (CASTING)
  - "worked about 80% of the time" (AAC)
- **Quote the sponsor's own numbers back to them.** Aloud: "Perfect Corp reports its beauty AI powers 800-plus brands … lifts sales conversion 2.5x". This ties the project's impact to the sponsor's business.
- **Use few numbers.** Aloud uses about 12, but most winners use 0–4. ConfidFit, KeepMe, CASTING, FaceTimeOS and kinemo have no market statistics at all.
- **In video, put the statistic in the first 10–25 s as large text or captions.** Examples:
  - HawkWatch: "So businesses lose over $35 million per day" by 6 s.
  - Nested: "27 Million People (2023 US)" by 4 s.
  - Aloud: "Eight and a half million Americans…" at 10 s.

### B5. Video patterns

**Length.** 0:50 to 4:53. The median is about 2:45. Most sit at 2:00–2:56, just under the usual 3-minute cap. Over 3 minutes: AAC 3:27, Duet 3:41, LLMIX 4:40, SalesShortcut 4:53. Under 1:15: ConfidFit 0:50, kinemo 1:00, gibber 1:10.

**First 10 seconds.** Nobody opens on a logo and a slow intro. Five opening types:
1. **Cold-open scene, no face:**
   - Aloud: the two bottles.
   - Second Voice: a dysarthric voice sample, then "Did you understand her?"
   - Shepherd: a blindfolded walk.
   - Nested: city and moving-box b-roll.
   - kinemo: a hallway run.
2. **Founders to camera with burned-in captions, stating the problem in one breath:**
   - FaceTimeOS: "Sometimes you need to do something on your computer…"
   - HawkWatch: "Hi! We're four tree hackers…" and a statistic by 6 s.
   - Mochi, Nutshell, AAC, Upload Drive-In: with a name lower third.
3. **Proof of the problem from real people:**
   - BackstageCommercials: viewer comments.
   - Upload Drive-In: real client emails.
4. **On-screen text hook over the product:** ShadeSpan ("The same t-shirt. Two customers. One of them can't see it.").
5. **Pure demo from frame 1:** Baymax (one take), gibber link (static shot), Globot and Vonar (screen recording).

**Face cam plus screen.**
- About 12 of 26 analysed videos show a team member's face.
- The common shape is face for the intro and outro, screen in the middle (Nutshell, AAC, Mochi, Tailored Labs), or a face bubble picture-in-picture over the screen (Vonar, Mochi, HawkWatch).
- The three 2026 YouCam winners whose YouTube videos were analysed (Aloud, ShadeSpan, ConfidFit) show no narrator face. They are polished, caption- or text-led product films. CASTING uses two on-camera presenters for its first third.
- veTriage is the extreme case: real users on camera, no screen.

**Captions.** Burned-in captions appear in Aloud, Second Voice, Mochi, HawkWatch and FaceTimeOS. CASTING has uploaded caption files. Captions make a silent first viewing work. For accessibility projects (Aloud, Second Voice, Mochi) they also match the project's theme.

**Music.** Not assessable from frames. Documented cases: ConfidFit credits a CC-BY track; Duet labels its background as "generated brain wave music".

**Demo proportion.**
- Most winners spend about 45–75% on the product working: Aloud ~60%, ShadeSpan ~65%, Nested ~65%, Storytopia ~75%, AAC ~72%.
- Some reach 100% (Baymax, gibber link, Globot).
- Low-demo exceptions win on something else: veTriage on real-use testimony; Duet, with about 80 s of architecture slide, on novelty.
- Devpost's own advice: "Make sure it's a demo!"

**Real world over slides.** The hardware winners (Shepherd, Baymax, SoundShield, Duet, kinemo) film the device being used by a person in a real place. Software winners show a real device (Aloud: "real iPhone recordings"; FaceTimeOS: used from a car).

**Middle beats that help.**
- A named "impossible" moment: "Now the part that should not be possible." (Aloud)
- Visible parallelism: "Eight try-on calls. In parallel. In front of you." / "8 / 8 measured" (CASTING)
- A short under-the-hood segment of 10–20 s: Aloud's endpoints, Storytopia's diagram.

**Closing.**
- A one-line thesis plus links or QR codes:
  - Aloud: three QR codes.
  - Second Voice: "GPT-5.6 reconstructs. The human decides."
  - CASTING: "Stock what sells. To the people who actually walk in."
  - Duet: "Come find your creative self with Duet".
  - Upload Drive-In: "IDEA + DEVELOPER + KIRO = APP".
  - BackstageCommercials: "Future of commerce".
- Or an end card that installs or tries the product (ConfidFit, LLMIX).
- **Chapters in the YouTube description:** Aloud, ShadeSpan and Upload Drive-In include timestamped chapters, which help judges jump straight to the demo.

### B6. Gallery and caption patterns

- **Count.** 0 to 23 images; median about 5. Hardware projects post many build photos (Shepherd 23). Several winners post 0–1 images (Second Voice, BackstageCommercials, Tailored Labs, AAC, Storytopia, SalesShortcut, LLMIX, Vonar, gibber).
- **Three caption styles:**
  1. **Full sentence stating what the image proves:**
     - "Consent before the camera opens, in plain words: one photo, this session only, nothing saved, nothing about identity inferred." (Aloud)
     - "KeepMe catches the disclosed glasses-removal drift before the shopper can approve the result." (KeepMe)
     - "The security page let's the admin control who can use the app…" (Upload Drive-In)
  2. **Short headline fragment:**
     - "One t-shirt, two customers, one cannot see it"
     - "The report a merchandising team gets" (ShadeSpan)
     - "veTriage — Now Live on the Paoli Vetcare Reception Desk"
  3. **Plain screen label:**
     - "Onboarding Flow", "Explore Page" (Nested)
     - "Choose Ports", "Token usage management" (Globot)
     - "Head Tracking Calibration" (Nutshell)
- **What the images show.** The strongest galleries show:
  - Outputs and evidence (ShadeSpan's 84-render grid, CASTING's coverage board and report).
  - Consent or safety screens (Aloud, KeepMe).
  - Real people using it (veTriage, kinemo).
  - Before and after (Mochi, CASTING "What the product page shows today vs. what CASTING shows").
- **Disclose synthetic content in the caption itself.** CASTING: "MERIDIAN GOODS is fictional; its campaign images are AI-generated and labeled."
- **Thumbnails.** Most use:
  - A dark or brand card with the name and one line (Aloud, KeepMe, ConfidFit, BackstageCommercials), or
  - The single most striking result image (ShadeSpan's two portraits with "One of them can't see it."; CASTING's 8-person grid), or
  - A real photo (veTriage vet with dog; Duet EEG user; SoundShield headphones).

  Only Second Voice had no thumbnail.

### B7. Phrases and styles that read as AI-generated or overclaiming

**Measured counts (story text only, 27 winners).**

| Word | Winners using it | Occurrences | Where |
|---|---|---|---|
| "seamless" | 10 | 13 | Nested, SalesShortcut, Nutshell, Mochi, BackstageCommercials, Vonar, Baymax, HawkWatch, FaceTimeOS, SoundShield |
| "revolution*" | 4 | 5 | Nutshell, Mochi, LLMIX, Duet ("revolutionizes" twice) |
| "leverag*" | 5 | 5 | Nested, Nutshell, Mochi, HawkWatch, Duet |
| "empower*" | 3 | 4 | SalesShortcut, Nutshell (twice), Duet |
| "cutting-edge" | 2 | 2 | SalesShortcut, Mochi |

The 2026 sponsor-API top entries score zero on all of these: Aloud, ShadeSpan, CASTING, KeepMe, ConfidFit, Second Voice, Shepherd. veTriage also scores zero on all of them.

**Em dashes.** Aloud, KeepMe, ConfidFit and Second Voice use 0. ShadeSpan (14) and CASTING (21) use many and still read as human, because their sentences are concrete. The em dash is not the tell. Abstraction is.

**Patterns the strongest winners avoid, and what they do instead**
- **Unhedged "first / only / world's first".** Avoided example: "First supply chain AI to use satellite imagery" (Globot). Hedged example: "as far as we can find, the first consumer skin tool…" (Aloud), "to our knowledge" (Duet). The YouTube title "Worlds First AI Video Editor" (Tailored Labs) is the unhedged version.
- **Vague magnitude ("millions", "billions") without a source.** The alternative is a specific, cited number, or your own measured count.
- **Abstract benefit stacks.** Avoided example: "scalable", "robust", "intuitive", "production-ready" in bullet lists (SalesShortcut, HawkWatch). The alternative is a measured fact: "under 50ms", "7 of 8 measured".
- **"Magic" or "almost magical" as an explanation.** It appears in Nested, Mochi, Tailored Labs and FaceTimeOS. The best entries explain the mechanism in one sentence instead.
- **Invented impact numbers.** ConfidFit states the rule directly: "no invented conversion percentages. Judges and merchants both notice when the copy overclaims."
- **Talking to the judges about winning.** Netra's "A Note to the Judges: On Recognizing the Winning Project … Do not view it as a mere "project"" is the clearest overclaim in the set.
- **Emoji-heavy headings and decorative "⸻" separators.** These read as template or LLM output (SalesShortcut, Vonar, Tailored Labs). Fine at a college hackathon, rare among 2026 sponsor-API winners.
- **Over-claiming AI's role.** veTriage: "GPT-5.6 and Codex helped us design and build those rules; they are not the live clinician." Second Voice: "Nothing is spoken automatically." Aloud: "the face image is never sent to a general vision model to freely describe it."

**Style traits of the restrained winners**
- Short declaratives ("It was not.", "It's dumb and it works.", "So it is not used.").
- Concrete nouns (bottles, receptionists, the 404 slug).
- One memorable principle line per page:
  - "honesty is engineered, not hoped for"
  - "consent should be specific enough for software to enforce"
  - "Clinical urgency and hospital capacity are separate."

---

## Part C. Devpost's official guidance (with URLs)

**1. Help Center: "Video-making best practices."** https://help.devpost.com/article/84-video-making-best-practices
- "we recommend creating a screencast (a video screen capture with audio narration) because it can help judges, voters, and other users to understand exactly how your app works, without the gimmicks."
- "Be sure to explain what your app does (and if making the video for a specific hackathon, how it addresses the hackathon) in the first few seconds of your video. … treat the opening seconds of your video as you would a movie trailer or TV ad: pique your audience's interest."
- "Edit out the messy stuff, if you can, and don't be afraid to do multiple takes."
- "Write out a script of what you'll say/show in your video, rehearse it before recording".
- Upload early: processing "could take anywhere from a few minutes to several hours or more."

**2. Devpost blog: "6 Tips for making a winning hackathon demo video."** https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video
- "Most hackathons require demo videos to be less than three minutes."
- "Write a script! Try to avoid ChatGPT here if you can—its output is often too generic and it won't describe your project better than you can." (Thegu5)
- "Use the Devpost submission form to create and write your elevator pitch and the project story. Do this before you start hacking/coding! … This will almost be your demo video script" (shemmarie)
- "Start the video with your elevator pitch. Explain what your app does and how it addresses the hackathon in the first few seconds of your video."
- "Don't try to pack in way too much information or speed up the audio to fit within a time limit." (Thegu5)
- "Keep it short, interesting (no slide shows/decks), and visually engaging." (shemmarie)
- "Address how it meets the judging criteria—are you addressing what the site actually asked for?" (Danny)
- "Be sure to mark your video as "Not for Kids" on YouTube so that it is not inaccessible to judges" (Babatunde)
- Devpost team: "Check the privacy settings of your video—if it's private, the judges won't be able to access it!" / "Make sure it's a demo! Show your project or app in action and include more information in your text description if needed."

**3. Devpost blog: "How to present a successful hackathon demo."** https://info.devpost.com/blog/how-to-present-a-successful-hackathon-demo
- "In a few sentences, explain the problem you're solving, or the status quo you're greatly improving."
- "it's crucial to show resolution to the problem you initially identified so your audience can see a) what your project does, and b) that you've completed the key components of it."
- "Skip mundane flows such as creating user credentials".
- "a great online presentation will describe the problem you're solving, show what the hack specifically does, and highlight its potential impact. You should mention the technologies you used, anything interesting you learned, and give credit to your teammates. The best presentations we see on our platform include screenshots and a video demo."

**4. Devpost blog: "How to win a hackathon: Advice from 5 seasoned judges."** https://info.devpost.com/blog/hackathon-judging-tips
- Richard Moot (Square): "the video becomes crucial in giving us our first indicator of how much time was invested into the actual submission."
- Richard Moot: "A project that really stands out is one that was clearly considering the judging criteria. … it's almost as if they had an idea that was independent of the actual contest and they're shoehorning it to fit."
- Karen Bajza-Terlouw (Databricks): "it was surprising to see how many submissions did not fulfill the basic requirements."
- Karen Bajza-Terlouw: "Presentation and storytelling matters and it can be a huge part of your success." / "The storytelling component is huge, don't underestimate this."
- Karen Bajza-Terlouw: "Ambiguity is a red flag … the video intro looked really cool … but then when you dug into the project or their GitHub, it was a lot lighter on code."
- Maria Yarotska (NEAR): "Do they see the problem behind the solution, or are they just trying to fit their solution to this particular hackathon?"
- Warren Marusiak (Atlassian): "Something that looks like it was a submission just to get a submission out there."

**5. Devpost blog: "Understanding hackathon submission and judging criteria: What really counts."** https://info.devpost.com/blog/understanding-hackathon-submission-and-judging-criteria
- It lists the common criteria: "technological implementation, ease of use, demonstration, potential impact, quality of the idea, and design".
- "If you can't explain how to use your project in a sentence or two, it might be too complicated."
- "Research your problem area thoroughly. Understanding the landscape helps you articulate your project's potential impact."
- It is a checklist: required tools/APIs, accessible URLs, video length, video public.

**6. Example of a hackathon-specific update: World's Largest Hackathon "Demo Video Tips."** https://worldslargesthackathon.devpost.com/updates/36832-demo-video-tips
- "Hit the essentials! Project requirements? Tools used? Problem solved? Solution unveiled? Include them all!"
- "Write out a script and practice it!"
- "make sure your video is public".

---

## Part D. Checklist for writing ours (based on the evidence above)

- **Tagline:** Name the user and the constraint. End with a proof ("screen off", "before launch", "Live now").
- **Opening:** One concrete, checkable scene or contrast in sentence 1. Put any statistic in the first paragraph only, cited inline in parentheses.
- **Personal story:** Use one if true and specific (names, place, date, a quoted user). Add one disclaimer sentence that refuses the overclaim. If there is no real story, use a vivid concrete scene instead; don't invent one.
- **Headings:** Rename the defaults to argue. Map at least one heading to each judging criterion, for example "How we used the YouCam API (Technological Implementation)".
- **Tech section:** Endpoints, the request path, and where the key lives. One gotcha you hit and fixed. Measured latency, cost and success rates.
- **Disclosure section:** What is measured vs curated vs synthetic, and what is sped up.
- **Try it / Live proof:** Live URL, repo, and app builds.
- **Video (2:30–2:55):**
  - 0–10 s: cold-open scene or problem proof, with burned-in captions.
  - By 25 s: one statistic and the product name.
  - 50–65%: demo on a real device.
  - 10–20 s: under the hood.
  - Close on a one-line thesis plus links or QR.
  - Add YouTube chapters. Mark the video "Not for Kids" and make it public.
- **Gallery:**
  - 5–8 images, each captioned with a full sentence saying what it proves.
  - Include a safety/consent screen, an output/result screen and a before/after.
  - Label any AI-generated people.
- **Thumbnail:** A dark or brand card with the name and one line, or the single most striking result image.
- **Words to delete before posting:**
  - seamless, revolutionize, leverage, empower, cutting-edge, game-changer, magic, robust, unlock, transform
  - an unhedged "first" or "only"
  - any un-sourced "millions"
