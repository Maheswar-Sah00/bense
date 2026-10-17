# Demo video: plan and script

Target length **2:45** (rules: 1 to 3 minutes; judges may stop at 3:00).
Format: **16:9, 1920×1080**, because judges watch on a laptop. You on camera + your phone screen + big number cards.
Rules to respect (from the hackathon rules):
- Show the app **running on the phone**.
- Say which YouCam APIs you use.
- **No third-party trademarks**: no L'Oréal or Garnier boxes, logos, or brand names on screen or spoken. Use the **Example shades** tab in the demo.
- Public on YouTube, marked "Not made for kids".

Do not show: your girlfriend's face or photos (unless she says yes), the API key, the `.env` file, real brand boxes, other people's faces.

---

## The layout (three kinds of shot)

```
A. FACE + PHONE (most of the video)          B. NUMBER CARD (full screen, 3 to 5 s each)
+---------------------------+----------+     +--------------------------------------+
|                           |  phone   |     |                                      |
|     you, talking          |  screen  |     |   34%                                 |
|     (front camera or      |  record- |     |   had to pay a professional to fix    |
|      laptop webcam)       |  ing     |     |   their home hair job                 |
|                           |          |     |                                       |
|  [caption line here]      |          |     |   OnePoll, 2,000 UK women, 2022       |
+---------------------------+----------+     +--------------------------------------+

C. PHONE FULL SCREEN (demo moments), your face in a small circle in a corner
```

- Background: plain wall, light in front of you (a window facing you is perfect).
- Captions burned in on every line (CapCut "Auto captions", then fix the words).
- Number cards: dark background, one big number, one plain line, the source in small text. The source always on screen.

---

## Script (say it in your own words; these are guides, not lines to read)

| Time | Shot | What is on screen | What you say (roughly) |
|---|---|---|---|
| 0:00–0:08 | C | The Bense reveal on the phone: "What the box promises" next to "What your hair will likely do", on the same face. Caption: **Same box. Same hair. Two very different results.** | "This is the same box of hair dye. On the left is what the box promises. On the right is what it will probably do to dark hair." |
| 0:08–0:30 | A | You. Caption follows your words. | "[Month], my girlfriend dyed her hair at home. It came out [what happened]. She was upset for two or three days and barely talked to me. I wanted to know if that was bad luck. It wasn't. The box did exactly what box dye does. It just doesn't tell you." |
| 0:30–0:35 | B | **Up to 70%** of at-home colour users are unsure which shade suits them. *A major hair-colour brand, quoted in The Drum, 9 May 2019* | "Even a big hair-colour brand's own team said most home dyers are guessing." (Don't name the brand on camera; the trademark rule.) |
| 0:35–0:40 | B | **About 10×** the box. Box: under $20 for most people. Fixing it at a salon: about $210. *Better Natured 2024; StyleSeat* | "And when it goes wrong, fixing it costs about ten times the box." |
| 0:40–0:46 | B | **48 of 178.** From naturally dark hair, only 48 of 178 lighter real boxes are expected to reach the colour on the box. *Bense, brand lift rules, 202 real shades* | "I loaded 202 real boxes. From dark hair, only about 1 in 4 of the lighter ones can actually get there." |
| 0:46–0:50 | Title | **Bense** · See what the box will do before you buy it. | "So I built Bense." |
| 0:50–1:10 | C → A | Selfie with white paper. The green hair mask appears. The level chart with your measured level. | "You take one selfie holding any white paper. YouCam finds exactly which pixels are hair. Bense measures how light they are. The paper fixes the room light. My hair: level [whatever the app says]." |
| 1:10–1:20 | C | "Has your hair been dyed before?" Tap No. Pick an example shade, for example **9.1 Very light ash blonde**. | "It asks the one thing no box asks: was your hair dyed before. Then I pick the box I want." |
| 1:20–1:45 | C | Rendering progress, then the two renders side by side, then the level chart with the gap (for level 2 hair and a 9.1 box it reads "Level 9 · 6 short"), then the reasons with sources. | "Two YouCam renders on my own photo. The box promise, and what my hair will likely do. [N] levels short, and it will go warm, not ash. Every reason links to the brand's own rule." |
| 1:45–2:00 | C | "Our recommendation": see a colourist, or the closest box that works. Tap "Use". | "And it tells me what to do instead. A box that will actually work on my hair, or see a colourist first." |
| 2:00–2:15 | C (with your face) | Hair profile: camera with the angle guide. You turn your head; text says "Turn more to your right"; it turns green and takes the photo. | "For the hair profile, YouCam needs side photos at the right angle. So the phone watches my head, tells me where to turn, and vibrates when it's right." |
| 2:15–2:30 | B / diagram | Simple diagram: Phone → our server (key stays here) → YouCam: Hair Color, Facial Color Tones, Hair Type, Frizz, Length, Density. Small text: 12 s to read your hair · 21 units · photos not stored. | "Under the hood: seven YouCam endpoints. The API key never leaves our server. Photos aren't stored." |
| 2:30–2:40 | A | Caption: **An estimate, not a guarantee. Always do the skin test.** | "It's an estimate, not a guarantee. And if it says see a colourist, it means it. Always do the skin test." |
| 2:40–2:48 | A → end card | End card: Bense · [URL] · QR code · "Built with the YouCam API". | "I can't promise it would have saved her those three days. But next time, she'll see it before she buys it. This is Bense." |

Total about 2:48. If you are over 3:00, cut the 2:00–2:15 angle-guide part first.

---

## How to record (free tools)

1. **Phone screen:** use the built-in screen recorder (Android: quick settings → Screen record, with "show touches" on; iPhone: Control Centre → Screen Recording). Record each demo step separately.
2. **You:** record with the laptop webcam or a second phone on a stand, at eye level. Look at the lens, not the screen.
3. **Edit in CapCut (desktop, free):**
   - 1920×1080 canvas.
   - Put the face video on the left two-thirds and the phone recording on the right third (layout A).
   - Use full-screen phone with your face in a small circle for demo moments (layout C).
   - Add number cards as text on a dark background (layout B).
   - Run Auto captions, then fix every word by hand.
   - Keep background music very low or skip it. Only use music you are allowed to use.
4. **Takes:** do each row of the script as its own short take. It's fine to do five takes of the story part. Don't speed up your voice.
5. **Before recording the demo:**
   - Use **Example shades**, not the brand tabs.
   - Clear old sessions.
   - Check the phone is on mobile data or good Wi-Fi, and that renders take about 12 to 15 seconds. Cut the waiting in the edit, and add a small "sped up" note if you do.
   - Do not show notifications. Turn on Do Not Disturb.

## YouTube upload

- Title: `Bense: see what the box dye will do to your hair before you buy it | YouCam API`
- Visibility: **Public**. Audience: **No, it's not made for kids**.
- Description (paste and edit):

```
My girlfriend's box dye went wrong and she was upset for days. Bense measures your hair from one selfie, shows what a box will really do next to what it promises, and tells you which box to buy instead.

Everything in this video is real: a real phone, live YouCam API calls. Every number on screen has a source listed in the project's EVIDENCE.md.

YouCam APIs: Hair Color (as a hair mask and for the renders), Facial Color Tones, Hair Type, Hair Frizziness, Hair Length, Hair Density, File upload.

0:00 Same box, two results
0:08 Why I built this
0:30 The numbers
0:50 Measuring my hair
1:20 Promise vs likely result
1:45 What to buy instead
2:00 Angle guide for the hair profile
2:15 Under the hood
2:30 Honest limits
```

## Checklist

- [ ] Under 3:00
- [ ] App running on the phone is visible
- [ ] YouCam APIs named
- [ ] No brand boxes, logos or names on screen
- [ ] Every number card shows its source
- [ ] Girlfriend said OK
- [ ] Public, not for kids, chapters in the description
