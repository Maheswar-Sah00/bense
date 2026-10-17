import { describe, expect, it } from 'vitest'
import {
  analysisResumePath,
  canViewAnalysisResults,
  neededViews,
  nextAnalysisView,
  type AnalysisCapture,
  type AnalysisView,
  type CapturedPhoto,
  type HairSetup,
} from './captureSession'

const photo = (view: AnalysisView) => ({ view, url: `blob:${view}`, id: view }) as CapturedPhoto

function capture(views: AnalysisView[], skipped: AnalysisView[] = [], hairSetup: HairSetup = 'loose'): AnalysisCapture {
  return { photos: Object.fromEntries(views.map((v) => [v, photo(v)])), skipped, hairSetup }
}

describe('analysis capture session', () => {
  it('walks the needed views in order, skipping ones the user skipped', () => {
    expect(nextAnalysisView(capture([]))).toBe('front')
    expect(nextAnalysisView(capture(['front']))).toBe('left45')
    expect(nextAnalysisView(capture(['front'], ['left45', 'right45']))).toBe('top')
    expect(nextAnalysisView(capture(['front', 'left45', 'right45', 'top']))).toBeUndefined()
  })

  it('only asks for photos the hair setup can use', () => {
    expect(neededViews('loose')).toEqual(['front', 'left45', 'right45', 'top'])
    expect(neededViews('tied')).toEqual(['top'])
    expect(neededViews('protective')).toEqual(['front'])
    expect(neededViews('covered')).toEqual([])
    expect(nextAnalysisView(capture([], [], 'tied'))).toBe('top')
  })

  it('allows results once something can be measured, or nothing could be', () => {
    expect(canViewAnalysisResults(capture(['front'], ['left45', 'right45', 'top']))).toBe(true)
    expect(canViewAnalysisResults(capture([], ['front', 'left45', 'right45', 'top']))).toBe(false)
    expect(canViewAnalysisResults(capture(['front']))).toBe(false)
    expect(canViewAnalysisResults(capture([], [], 'covered'))).toBe(true)
  })

  it('resumes at results when they can be shown or a profile exists', () => {
    expect(analysisResumePath(capture(['front']))).toBe('/analysis/photos')
    expect(analysisResumePath(capture(['front', 'left45', 'right45', 'top']))).toBe('/analysis/results')
  })
})
