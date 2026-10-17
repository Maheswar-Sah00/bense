import {
  measurementPlan,
  METRIC_VIEWS,
  normaliseDensity,
  normaliseFrizz,
  normaliseHairType,
  normaliseLength,
  setupNotes,
  type AnalysisView,
  type HairMetric,
  type HairProfile,
  type HairSetup,
  type Measurement,
} from '../../shared/domain/hairProfile'
import type { ImageType } from '../images'
import { YouCamError, type YouCamClient } from '../youcam/client'
import { TaskTimeoutError, type PollOptions } from '../youcam/poll'

// YouCam Hair Type / Frizziness / Length / Density Detection.
// Contracts: docs/youcam-api/ai_hair_{type,frizziness,length,density}_detection.yaml

export const HAIR_ENDPOINTS: Record<HairMetric, string> = {
  type: 'hair-type-detection',
  frizz: 'hair-frizziness-detection',
  length: 'hair-length-detection',
  density: 'hair-density-detection',
}

export const DEFAULT_HAIR_POLL: PollOptions = { intervalMs: 2500, timeoutMs: 90_000 }

export interface ViewImage {
  bytes: Uint8Array
  type: ImageType
  width: number
  height: number
}

/** Plain-language guidance for the documented engine error codes. */
const ENGINE_ERRORS: Record<string, string> = {
  error_mismatch_image_size: 'The three photos must be the same size. Retake them in one go.',
  error_below_min_image_size: 'A photo is too small to analyse.',
  error_face_position_invalid: 'Keep your whole face in the frame.',
  error_face_position_too_small: 'Your face is too small in the photo. Move closer.',
  error_face_position_out_of_boundary: 'Your face is too close or partly out of frame.',
  error_insufficient_lighting: 'The photo is too dark. Try brighter, even light.',
  error_face_angle_invalid: 'The head angle wasn’t right: front within 10°, sides turned more than 15°.',
  error_no_face: 'No face was found in the photo.',
  error_face_parsing: 'Your face and hair couldn’t be separated clearly. Try a sharper photo.',
}

function failure(error: unknown): Measurement<never> {
  if (error instanceof TaskTimeoutError) return { status: 'failed', message: 'The analysis took too long. Try again.' }
  if (error instanceof YouCamError) {
    if (error.status === 401) return { status: 'failed', message: 'The analysis service rejected our credentials.' }
    if (error.errorCode === 'CreditInsufficiency') return { status: 'failed', message: 'The analysis service is out of credits for now.' }
    if (error.status === 429) return { status: 'failed', message: 'The analysis service is busy. Try again in a minute.' }
    return { status: 'failed', message: 'The analysis service couldn’t be reached. Try again.' }
  }
  throw error
}

const NORMALISE: Record<HairMetric, (results: Record<string, unknown>) => Measurement<unknown>> = {
  type: (r) => normaliseHairType(r.hair_type),
  frizz: (r) => normaliseFrizz(r.hair_frizziness),
  length: (r) => normaliseLength(r.hair_length),
  density: (r) => normaliseDensity(r.hair_density),
}

/**
 * Body for each task. Type and frizz take src_file_ids in the documented order
 * ['frontFace', 'rightFace', 'leftFace']. Our "left side" view asks the user to turn
 * their face to the right (so we send it as rightFace), and "right side" as leftFace.
 * The docs don't say whose right they mean, so `swapSides` sends them the other way round.
 */
function taskBody(metric: HairMetric, ids: Partial<Record<AnalysisView, string>>, swapSides = false): Record<string, unknown> {
  if (metric === 'type' || metric === 'frizz') {
    return { src_file_ids: swapSides ? [ids.front, ids.right45, ids.left45] : [ids.front, ids.left45, ids.right45] }
  }
  return { src_file_id: metric === 'length' ? ids.front : ids.top }
}

export async function analyseHair(
  client: YouCamClient,
  views: Partial<Record<AnalysisView, ViewImage>>,
  setup: HairSetup,
  poll: PollOptions = DEFAULT_HAIR_POLL,
  only?: readonly HairMetric[],
): Promise<HairProfile> {
  const plan = measurementPlan(setup, views, only)
  const results: Partial<Record<HairMetric, Measurement<unknown>>> = {}
  for (const item of plan) if (!item.run) results[item.metric] = { ...item.reason! }

  // The three angles must be the same size (documented: error_mismatch_image_size).
  const trio = METRIC_VIEWS.type.map((v) => views[v])
  const trioMismatch = trio.every(Boolean) && trio.some((v) => v!.width !== trio[0]!.width || v!.height !== trio[0]!.height)
  for (const metric of ['type', 'frizz'] as const) {
    const item = plan.find((p) => p.metric === metric)!
    if (item.run && trioMismatch) {
      item.run = false
      results[metric] = { status: 'failed', errorCode: 'error_mismatch_image_size', message: ENGINE_ERRORS.error_mismatch_image_size }
    }
  }

  const running = plan.filter((p) => p.run)
  // Uploads are free, so each task group gets its own file ids. In a live test (2026-10-15),
  // Length failed with unknown_internal_error while sharing the front file id with Type and
  // Frizz running at the same time, and succeeded with its own upload.
  const groups: { metrics: HairMetric[]; views: AnalysisView[] }[] = [
    { metrics: running.filter((p) => p.metric === 'type' || p.metric === 'frizz').map((p) => p.metric), views: METRIC_VIEWS.type },
    { metrics: running.filter((p) => p.metric === 'length').map((p) => p.metric), views: METRIC_VIEWS.length },
    { metrics: running.filter((p) => p.metric === 'density').map((p) => p.metric), views: METRIC_VIEWS.density },
  ].filter((g) => g.metrics.length)

  await Promise.all(
    groups.map(async (group) => {
      const ids: Partial<Record<AnalysisView, string>> = {}
      try {
        await Promise.all(
          group.views.map(async (view) => {
            const image = views[view]!
            ids[view] = await client.uploadImage(image.bytes, `${view}.${image.type === 'image/png' ? 'png' : 'jpg'}`, image.type)
          }),
        )
      } catch (error) {
        for (const metric of group.metrics) results[metric] = failure(error)
        return
      }
      await Promise.all(
        group.metrics.map(async (metric) => {
          try {
            const run = (swapSides = false) => client.runTask(HAIR_ENDPOINTS[metric], taskBody(metric, ids, swapSides), poll)
            let task = await run()
            // YouCam intermittently answers unknown_internal_error for photos that succeed on a
            // second try (seen live on 2026-10-15). Failed tasks cost nothing, so retry once.
            if (task.status === 'error' && (task.engineError ?? 'unknown_internal_error') === 'unknown_internal_error') {
              task = await run()
            }
            // A side photo turned the "wrong" way for YouCam's rightFace/leftFace slot fails the angle
            // check. The docs don't say whose right they mean, so try the sides the other way round (free if it fails).
            if (task.status === 'error' && task.engineError === 'error_face_angle_invalid' && (metric === 'type' || metric === 'frizz')) {
              const swapped = await run(true)
              if (swapped.status !== 'error') console.info(`[hair] ${metric}: accepted with the side photos swapped`)
              task = swapped
            }
            if (task.status === 'error') {
              const code = task.engineError ?? 'unknown_internal_error'
              results[metric] = {
                status: 'failed',
                errorCode: code,
                message: ENGINE_ERRORS[code] ?? 'This measurement couldn’t be completed.',
              }
              return
            }
            results[metric] = NORMALISE[metric]((task.results ?? {}) as Record<string, unknown>)
          } catch (error) {
            results[metric] = failure(error)
          }
        }),
      )
    }),
  )

  return {
    type: results.type as HairProfile['type'],
    frizz: results.frizz as HairProfile['frizz'],
    length: results.length as HairProfile['length'],
    density: results.density as HairProfile['density'],
    measuredAt: new Date().toISOString(),
    notes: setupNotes(setup),
  }
}
