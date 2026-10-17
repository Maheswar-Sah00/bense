import { describe, expect, it } from 'vitest'
import { captureReducer, type CaptureState, type Draft } from './captureMachine'

const draft = { url: 'blob:d', source: 'camera', width: 640, height: 480, blob: new Blob() } as Draft

describe('captureReducer', () => {
  it('runs the camera path: start, live, capture, review, confirm', () => {
    let s: CaptureState = { phase: 'intro' }
    s = captureReducer(s, { type: 'camera-starting' })
    s = captureReducer(s, { type: 'camera-live' })
    expect(s.phase).toBe('live')
    s = captureReducer(s, { type: 'processing', source: 'camera' })
    s = captureReducer(s, { type: 'processed', draft })
    expect(s).toEqual({ phase: 'review', draft })
    expect(captureReducer(s, { type: 'confirmed' })).toEqual({ phase: 'confirmed' })
  })

  it('shows camera errors only while the camera is starting or live', () => {
    const starting: CaptureState = { phase: 'starting' }
    expect(captureReducer(starting, { type: 'camera-failed', issue: 'denied' })).toEqual({
      phase: 'camera-error',
      issue: 'denied',
    })
    const reviewing: CaptureState = { phase: 'review', draft }
    expect(captureReducer(reviewing, { type: 'camera-failed', issue: 'interrupted' })).toBe(reviewing)
  })

  it('ignores a late camera start after the user moved on', () => {
    const processing: CaptureState = { phase: 'processing', source: 'upload' }
    expect(captureReducer(processing, { type: 'camera-live' })).toBe(processing)
  })

  it('returns to the intro with a message when a photo fails', () => {
    expect(captureReducer({ phase: 'processing', source: 'upload' }, { type: 'failed', message: 'Bad file' })).toEqual({
      phase: 'intro',
      notice: 'Bad file',
    })
  })
})
