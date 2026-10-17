// Typed model of confirmed photos, shared by hair-colour prediction and hair analysis.
// Photos live in memory only (Blob + object URL) and are never written to storage.

import {
  measurementPlan,
  METRIC_VIEWS,
  type AnalysisView,
  type HairMetric,
  type HairProfile,
  type HairSetup,
} from '../../shared/domain/hairProfile'

export { METRIC_VIEWS }
export type { AnalysisView, HairMetric, HairProfile, HairSetup }
export type CaptureView = 'colour' | AnalysisView
export type CaptureSource = 'camera' | 'upload'

export interface CapturedPhoto {
  id: string
  view: CaptureView
  /** JPEG with orientation applied, at most 1024 px on the long edge. */
  blob: Blob
  /** Object URL for display. Revoked when the photo is replaced or cleared. */
  url: string
  width: number
  height: number
  source: CaptureSource
  capturedAt: number
}

export const ANALYSIS_VIEWS: AnalysisView[] = ['front', 'left45', 'right45', 'top']

export interface AnalysisCapture {
  photos: Partial<Record<AnalysisView, CapturedPhoto>>
  /** Views the user couldn't take, e.g. because of a hairstyle. */
  skipped: AnalysisView[]
  hairSetup: HairSetup
  /** Latest YouCam profile, tied to the photos it came from (photo ids + setup). */
  profile?: { key: string; profile: HairProfile }
}

/** Identifies one set of photos + setup, so the same set is never analysed (and paid for) twice. */
export function profileKey(analysis: AnalysisCapture): string {
  const ids = ANALYSIS_VIEWS.map((view) => analysis.photos[view]?.id ?? '-')
  return [...ids, analysis.hairSetup].join('|')
}

export interface CaptureSession {
  colour?: CapturedPhoto
  analysis: AnalysisCapture
}

export function capturedCount(analysis: AnalysisCapture): number {
  return ANALYSIS_VIEWS.filter((view) => analysis.photos[view]).length
}

/** Views worth capturing for this hair setup (none are asked for that couldn't be used). */
export function neededViews(setup: HairSetup): AnalysisView[] {
  const runnable = measurementPlan(setup, { front: 1, left45: 1, right45: 1, top: 1 }).filter((p) => p.run)
  return ANALYSIS_VIEWS.filter((view) => runnable.some((p) => METRIC_VIEWS[p.metric].includes(view)))
}

/** First needed view that is neither captured nor skipped. */
export function nextAnalysisView(analysis: AnalysisCapture): AnalysisView | undefined {
  return neededViews(analysis.hairSetup).find((view) => !analysis.photos[view] && !analysis.skipped.includes(view))
}

/** What will run with the photos taken so far. */
export function analysisPlan(analysis: AnalysisCapture) {
  return measurementPlan(analysis.hairSetup, analysis.photos)
}

/**
 * Every needed view is dealt with, and either something can be measured or nothing could
 * be for this setup (then the profile explains why, and hair colour still works).
 */
export function canViewAnalysisResults(analysis: AnalysisCapture): boolean {
  if (nextAnalysisView(analysis)) return false
  return neededViews(analysis.hairSetup).length === 0 || analysisPlan(analysis).some((p) => p.run)
}

export function analysisResumePath(analysis: AnalysisCapture): string {
  return analysis.profile || canViewAnalysisResults(analysis) ? '/analysis/results' : '/analysis/photos'
}
