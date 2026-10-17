# Devpost submission: Bense (本色)

Paste each block into the matching Devpost field. Text in [square brackets] is for you to fill in or delete.
Every number below is listed in `EVIDENCE.md` with its source. If you change a number, change it there too.

---

## Project name

Bense

## Elevator pitch (Devpost limit: 200 characters)

> The box shows the model's hair, not yours. Bense measures your hair from a selfie, shows what the box will really do, and tells you which box to buy instead.

(155 characters)

## Tagline for the thumbnail / first line

> See what the box will do to your hair before you buy it.

---

## Project story (paste into "About the project")

### Three days

[Month] my girlfriend dyed her hair at home. She picked the box by the picture on the front. It did not come out like the picture. [One line, in your words, about what it looked like: for example "It went orange at the roots and stayed dark everywhere else."] She was upset for two or three days and barely wanted to talk, even to me.

I wanted to know if that was bad luck. It was not. The box did exactly what box dye does. The picture on the front just doesn't tell you that.

### The problem, in numbers

Hair dye is not a niche product. Between half and four in five women in the US, Japan and the EU have used it (US National Cancer Institute). In the UK, 53% of women colour at home (Mintel).

And people know they are guessing. L'Oréal's own head of at-home colour said in 2019 that "up to 70% of at-home color users are unsure which shade suits them." In a Garnier survey of 2,000 US women, 47.8% of those dyeing at home were worried the result wouldn't be what they wanted.

When it goes wrong, it is expensive to undo. Most home dyers (73%) pay under $20 for a box. A colour correction at a US salon averages about $210, so roughly ten times the box. In a 2022 UK poll, 34% of women who do their own hair had to pay a professional to fix it.

It also hurts. One in five UK women say they have cried over a bad hair day. That matched what I saw at home.

### What the box doesn't tell you

The brands publish the rules themselves, in small print:

- Box dye lightens natural hair only about 2 to 3 levels (Garnier). Black hair will not become blonde.
- Dye can't lift dye. If your hair is already coloured, another box won't make it lighter. Only bleach or a remover can.
- When dark hair lightens, warm red and orange show through. That's why "ash blonde" often comes out brassy.
- Ash on yellow or lightened hair can turn green.

Every try-on tool I tried paints the box colour straight onto your photo. None of them asked what colour my hair is now, or whether it was dyed before.

So I counted. I loaded 202 real L'Oréal Paris and Garnier shades sold in India and the USA. For someone with naturally dark hair (level 2), 178 of those boxes are lighter than their hair. Even if we allow the 2 levels of lift the brands describe, only 48 of the 178 (27%) are expected to reach the colour on the box. The other 130 will fall short, and the box picture won't tell you.

### What Bense does

1. **Measures your hair, not a guess.** You take a selfie, ideally holding any plain white paper. YouCam finds exactly which pixels are hair. Bense measures how light those pixels are and turns that into a hair level from 1 (black) to 10 (lightest blonde). The white paper corrects for the light in your room. You always confirm the level.
2. **Asks the question no box asks.** Has your hair been dyed before? With what?
3. **Checks the box against your hair.** Pick a box, from 202 real L'Oréal Paris and Garnier shades or our example shades. Bense applies the brands' own rules and predicts where your hair will actually land.
4. **Shows both on your own face.** "What the box promises" and "what your hair will likely do", side by side, rendered on your photo with YouCam Hair Color. A simple chart shows your level now, the likely result and the box promise, with the gap marked: "Level 9, 3 short".
5. **Tells you what to do instead.** A box closer to your hair that the same rules expect to work, or a plain "see a colourist first". It never says yes to a box after a safety answer says no (a past reaction, black henna, or eyebrows and lashes).

There is also an optional hair profile. YouCam measures hair type, frizz, length and density from four photos. To get those photos right, Bense watches your head angle on the phone itself and talks you through it: "Turn more to your right." The phone vibrates, and the photo is taken when you are at the right angle.

### How we used the YouCam API (Technological Implementation)

Bense uses seven YouCam endpoints. The API key lives only on our server; the browser never sees it.

- **File upload** (`POST /s2s/v2.0/file`, then the presigned upload) for every photo.
- **Hair Color as a measuring tool.** This is the part I am proudest of. YouCam has no "hair level" API. But Hair Color paints hair very precisely. So we ask it to paint the hair pure green (`#00FF00`, intensity 100) and use that render as a mask. Every pixel where green beats red and blue by more than 40 is hair. We then take the median lightness (CIE L\*) of those same pixels in the original photo and convert it to a level. On YouCam's own sample photo this read L\* 58.5 (level 8), and the same in two renders hours apart. It costs 1 unit.
- **Hair Color for the reveal.** Two renders in parallel: the box colour, and the colour our rules predict. Both at the same intensity, so the only difference is the colour. 12 to 15 seconds.
- **Facial Color Tones** as a cross-check of the hair colour family (20 units).
- **Hair Type, Frizziness, Length and Density** for the hair profile. Type and Frizz need three photos at specific angles, which is why we built the live angle guide (on-device face tracking, no frames leave the phone). If YouCam rejects the side photos, the server retries with them swapped, because the docs don't say whose "right" they mean. Failed tasks cost nothing.

Measured in the browser: the colour reading, hair mask and level measurement run in parallel in 12.3 seconds. The whole colour journey took 33.2 seconds. One full colour check costs 21 units, and the reveal adds 2.

The prediction itself is plain rules, not a model guessing. Each rule shows its source in the app. There are 166 unit tests and 34 browser tests.

### What we checked against real products

The 202 real shades come from the brands' own websites (lorealparisusa.com, lorealparis.co.in, garnierusa.com, garnier.in), checked on 16 October 2026. Each one links back to its product page. We left out 96 products where the code gives no clear level, such as half-levels and letter codes, and all bleach kits. L'Oréal India's own FAQ calls Casting Crème Gloss semi-permanent, so Bense predicts those boxes won't lighten at all.

### Honesty: what is measured, what is modelled, what we don't know yet

- The hair level is an estimate. Without the white paper, room light can move it by about a level, and the app says so. With the paper, it is within about half a level. We have not yet tested it against hair with a known level. Until we do, we don't claim an accuracy number.
- Very dark or tightly curled hair can read darker than it is, because of shadows between strands.
- The prediction rules come from brand and colourist guidance. They are sensible, but not scientifically validated.
- Box levels are read from the shade codes. Most brand sites don't explain their numbers, so we use the usual convention (the first number is the level) and say so on every shade.
- Swatch colours are our own colour model, not the brands' colours.
- YouCam's render keeps much of your hair's lightness, so the "promise" render on dark hair looks less light than the box. The numbers carry the real gap.
- [Update before submitting: Hair Type and Frizz have / have not been verified live.]
- Bense can't tell from a photo whether a dye is safe for you. Do the skin test in the box every time.
- Photos stay on the phone except when you ask for an analysis. They are not stored, logged or sent to analytics.

### Who else is trying

Big brands have try-on tools, and they look great. But they paint the box colour onto your photo. I tested L'Oréal's US try-on with a photo of naturally black hair: a reddish-blonde box came out light copper-brown, with no question about my current colour and no warning. Salons have devices that measure hair (Schwarzkopf SalonLab, L'Oréal Coloright), but you have to be in the salon already. As far as I could find, no consumer tool measures your hair from a selfie, checks your dye history, and shows the likely result next to the box promise.

### What's next

- Test the level measurement on 20 people whose hair level a colourist has confirmed, and publish the result, good or bad.
- A "roots in six weeks" render, using YouCam's ombré mode.
- Let a shop show "Will this box work on me?" next to each product.

### Try it

- Live app: [URL]
- Demo mode (no camera or API key needed): [URL]/demo
- Code: [GitHub URL]

---

## Built with

`youcam-api`, `youcam-hair-color`, `youcam-facial-color-tones`, `youcam-hair-type-detection`, `youcam-hair-frizziness-detection`, `youcam-hair-length-detection`, `youcam-hair-density-detection`, `react`, `typescript`, `vite`, `fastify`, `zod`, `mediapipe`, `pwa`

## Before you paste

- Read it out loud once. Change any sentence that doesn't sound like you. It should sound like you talking to a friend.
- Delete these if they sneak in: seamless, revolutionize, leverage, empower, cutting-edge, game-changer, magic, robust, unlock, transform, "world's first".
- Ask your girlfriend before publishing her story.
