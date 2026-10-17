# YouCam API contracts

Official OpenAPI files downloaded on 2026-10-15 from docs.perfectcorp.com. The app's code follows these files.

| File | Source |
|---|---|
| `file.yaml` | https://docs.perfectcorp.com/_bundle/reference/file.yaml |
| `ai_skin_tone_analysis.yaml` | https://docs.perfectcorp.com/_bundle/reference/ai_skin_tone_analysis.yaml (Facial Color Tones) |
| `ai_hair_color.yaml` | https://docs.perfectcorp.com/_bundle/reference/ai_hair_color.yaml |

Other pages: [polling guide](https://docs.perfectcorp.com/reference/description/polling_guide.md), [rate limits](https://docs.perfectcorp.com/develop/rate_limit.md) (250 requests per 300 s per IP and per key; HTTP 429), [error codes](https://docs.perfectcorp.com/develop/error_codes.md).

## Facial Color Tones facts the app depends on
- `POST /s2s/v2.0/task/skin-tone-analysis` with `src_file_id` (or `src_file_url`) and optional `face_angle_strictness_level` (`strict`, `high` (default), `medium`, `low`, `flexible`).
- `GET /s2s/v2.0/task/skin-tone-analysis/{task_id}` returns `data.task_status` (`running`, `success`, `error`), `data.error`, `data.error_message`, and `data.results.{face_quality, color}`.
- `results.color.hair_color` is an **enum of 7 hex swatches** (`#a0a0a0`, `#722626`, `#000000`, `#FAF0BE`, `#42280E`, `#808080`, `#B56637`), not a measured colour. `hair_color_name` is one of Auburn, Black, Blonde, Brown, Grey/White, Red. Neither is a 1–10 level.
- When the hair is hidden, no `hair_color` is returned. This was observed by the edition-1 project Hue.U.
- Image: jpg/png, at most 10 MB, long side at most 4096 px, at least 320 px, one person, face width over 60% of the image width.
- Cost: 20 units per successful task. Error tasks cost nothing. A task that is never polled to completion can still consume units.

## Hair Color: what the live tests showed (2026-10-15)
- Contract: `POST /s2s/v2.0/task/hair-color` with `src_file_id`, `pattern: {name: "full"}` and `palettes: [{color, color_intensity 0–100}]`. Any `preset` overrides the palette, so the app never sends one. The result is at `data.results.url`, valid for 2 hours; the app downloads it straight away and checks the bytes. Results have been PNG. Each full render costs 1 unit.
- **Lightness is only partly controllable.** The API recolours but keeps much of the original lightness.
  - Darkening works strongly: blonde went from hair L* 55 to 21 with `#2E2117` at intensity 100.
  - Lightening is partial: brown at L* 21 went to L* 43 with a level-9 ash target at intensity 100, and to 36 at intensity 80.
  - So on dark hair the "box promise" render reaches roughly level 5–6, not 9. The numbers and headline carry the level gap; the images show the tone difference.
- **Ash renders read as grey if the colour has too little chroma.** The original model ash (a*/b* 0/4) rendered as silver. With 1/9 at intensity 100 it reads as ash blonde on light hair, and as a slightly olive greige on dark hair. That olive cast is the main visual limitation on dark bases.
- Both renders use the same intensity (100), so the only difference between them is the colour.
- Timing on 2026-10-15: one render takes about 8–10 s; the two-render reveal takes about 13–15 s in parallel. The whole mobile flow (photo, colour reading, confirmation, shade, reveal) took 27.9 s.
- The dark-hair test base is synthetic: it's the docs sample recoloured with Hair Color. A real dark-hair selfie is still needed to confirm the look.

## Hair level measurement with a Hair Color mask (2026-10-15)
- A `#00FF00` render at intensity 100 marks the hair precisely. Pixels where the render's green beats red and blue by more than 40 are hair, and the face, skin and background are excluded (checked visually on two samples).
- The median CIE L* of those pixels in the original photo is stable:
  - two renders of the docs sample hours apart gave L* 58.58 and 58.5;
  - working sizes from 256 to 1024 px and 0–3 pixels of edge erosion move it by under 0.6 L*.
  - One level is 7 L*.
- Measured live: docs blonde sample L* 58.5 (level 8); synthetic dark base L* 23.4–23.6 (level 3); docs curly sample L* 8.4 (level 1). In the curly sample, shadows between curls dominate the median.
- The white-card calibration is per-channel gain in linear RGB, mapping the card to sRGB 245. In unit tests it recovers the true colour under a dim orange light.
- The L*→level bands are the shade model's and are uncalibrated. That mapping, not the mask, is the main source of error.

## Hair Type, Frizziness, Length and Density: what the live tests showed (2026-10-15)
Contracts: `ai_hair_type_detection.yaml`, `ai_hair_frizziness_detection.yaml`, `ai_hair_length_detection.yaml`, `ai_hair_density_detection.yaml`.
- Type and Frizz take `src_file_ids` in the order `[frontFace, rightFace, leftFace]`, all the same size (`error_mismatch_image_size`), at least 320 px. The front must be within 10° and the sides turned more than 15° (`error_face_angle_invalid`). 2 units each.
- Length takes `src_file_id` (front), 2 units. Density takes `src_file_id` (head lowered about 45°, face still visible; `error_no_face` otherwise), at least 100 px, 1 unit.
- **Verified live:**
  - **Length:** front photos returned `above chest or longer` and `short hair or longer`.
  - **Density:** a top-down sample from the density docs page returned `Low Density` (score 0.92–0.94), the same label the docs give that image.
- **Not verified live: Type and Frizz.**
  - The only same-person three-view sample in the docs is the frizz page's illustration, which uses full 90° profiles. It returned `error_face_angle_invalid` with both side orders.
  - Real photos turned about 45° are still needed. These would also confirm which side is `rightFace`.
- **Intermittent `unknown_internal_error`:** Density failed twice on an image that succeeded on the next two tries, and Length failed once while sharing a file id with concurrent tasks.
  - The server now retries a task once on this error (failed tasks cost nothing).
  - Each task group gets its own upload.
  - The results screen can retry only the failed measurements.
- Timing through the browser: four tasks in parallel take 20–28 s; Length alone takes about 9 s.
