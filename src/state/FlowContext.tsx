import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  LEVEL_METHODS,
  PREVIOUS_DYES,
  HAIR_COLOUR_NAMES,
  type HairColourReading,
  type StartingColour,
} from '../../shared/domain/hairColourReading'
import { isHairLevel } from '../../shared/domain/hairLevel'
import { HAIR_SETUPS, type HairProfile } from '../../shared/domain/hairProfile'
import type { SafetyAnswers } from '../../shared/domain/predictionEngine'
import { findShade } from '../../shared/domain/shadeCatalogue'
import type { AnalysisView, CapturedPhoto, CaptureSession, HairSetup } from './captureSession'
import type { FlowSettings, FlowState, LevelMeasureState, RevealRenders } from './flow'

// Choices survive a reload via sessionStorage. Photos stay in memory only and are
// dropped when the tab closes.
const STORAGE_KEY = 'bense.flow'
const SAFETY_KEYS = ['previousReaction', 'blackHenna', 'browsOrLashes'] as const

function loadInitialState(): FlowState {
  const state: FlowState = {
    colour: {},
    analysis: { photos: {}, skipped: [], hairSetup: 'loose' },
    safety: {},
    settings: { liftLevels: 1 },
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    if (isStartingColour(saved.starting)) state.colour.starting = saved.starting
    if (isSavedReading(saved.reading)) state.colour.reading = saved.reading
    if (typeof saved.shadeId === 'string') {
      if (findShade(saved.shadeId)) state.colour.shadeId = saved.shadeId
      else state.colour.unavailableShadeId = saved.shadeId
    }
    if (HAIR_SETUPS.includes(saved.hairSetup as HairSetup)) state.analysis.hairSetup = saved.hairSetup as HairSetup
    if (saved.hairSetup === 'styled') state.analysis.hairSetup = 'tied' // value from an older version
    if (saved.hairSetup === 'short') state.analysis.hairSetup = 'loose' // no longer asked; Length measures it
    const profile = saved.profile as { key?: unknown; profile?: HairProfile } | undefined
    if (typeof profile?.key === 'string' && profile.profile?.measuredAt) {
      state.analysis.profile = { key: profile.key, profile: profile.profile }
    }
    const safety = (saved.safety ?? {}) as Record<string, unknown>
    for (const key of SAFETY_KEYS) if (typeof safety[key] === 'boolean') state.safety[key] = safety[key] as boolean
    const lift = (saved.settings as { liftLevels?: unknown } | undefined)?.liftLevels
    if (lift === 1 || lift === 2 || lift === 3) state.settings.liftLevels = lift
  } catch {
    // Unreadable storage: start fresh.
  }
  return state
}

function isStartingColour(value: unknown): value is StartingColour {
  const v = value as StartingColour | undefined
  return (
    !!v &&
    isHairLevel(v.confirmedLevel) &&
    LEVEL_METHODS.includes(v.method) &&
    ['yes', 'no', 'unsure'].includes(v.previouslyDyed) &&
    (v.correctedFamily === undefined || HAIR_COLOUR_NAMES.includes(v.correctedFamily)) &&
    (v.previousDye === undefined || PREVIOUS_DYES.includes(v.previousDye))
  )
}

function isSavedReading(value: unknown): value is { photoId: string; reading: HairColourReading } {
  const v = value as { photoId?: unknown; reading?: { source?: unknown } } | undefined
  return !!v && typeof v.photoId === 'string' && v.reading?.source === 'youcam-facial-color-tones'
}

function saveChoices(state: FlowState) {
  const { starting, reading, shadeId } = state.colour
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        starting,
        reading,
        shadeId,
        hairSetup: state.analysis.hairSetup,
        profile: state.analysis.profile,
        safety: state.safety,
        settings: state.settings,
      }),
    )
  } catch {
    // Storage can be unavailable (private mode); choices then last for this session only.
  }
}

interface FlowActions {
  setColourPhoto: (photo: CapturedPhoto) => void
  setReading: (photoId: string, reading: HairColourReading) => void
  confirmStartingColour: (starting: StartingColour) => void
  setShade: (shadeId: string) => void
  setAnalysisPhoto: (view: AnalysisView, photo: CapturedPhoto) => void
  skipAnalysisView: (view: AnalysisView) => void
  setHairSetup: (setup: HairSetup) => void
  setSafetyAnswer: (key: keyof SafetyAnswers, value: boolean) => void
  setLiftLevels: (levels: FlowSettings['liftLevels']) => void
  setReveal: (reveal: RevealRenders) => void
  setMeasure: (measure: LevelMeasureState) => void
  setHairProfile: (key: string, profile: HairProfile) => void
  resetAll: () => void
}

const FlowContext = createContext<(FlowState & FlowActions) | null>(null)

const revoke = (photo?: CapturedPhoto) => photo && URL.revokeObjectURL(photo.url)
const revokeReveal = (reveal?: RevealRenders) => {
  if (!reveal) return
  URL.revokeObjectURL(reveal.promise.url)
  if (reveal.result.url !== reveal.promise.url) URL.revokeObjectURL(reveal.result.url)
}

const revokeMeasure = (measure?: LevelMeasureState) => measure && URL.revokeObjectURL(measure.maskUrl)

function allPhotos(state: FlowState): CapturedPhoto[] {
  return [state.colour.photo, ...Object.values(state.analysis.photos)].filter((p): p is CapturedPhoto => !!p)
}

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(loadInitialState)
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
    saveChoices(state)
  }, [state])

  // Release photo memory if the provider ever unmounts.
  useEffect(
    () => () => {
      allPhotos(latest.current).forEach(revoke)
      revokeReveal(latest.current.colour.reveal)
      revokeMeasure(latest.current.colour.measure)
    },
    [],
  )

  const setColourPhoto = useCallback(
    (photo: CapturedPhoto) => {
      if (state.colour.photo?.url !== photo.url) revoke(state.colour.photo)
      revokeReveal(state.colour.reveal)
      revokeMeasure(state.colour.measure)
      // A new photo needs a new reading and render; the confirmed level stays as a starting point.
      setState((s) => ({ ...s, colour: { ...s.colour, photo, reading: undefined, reveal: undefined, measure: undefined } }))
    },
    [state.colour.photo, state.colour.reveal, state.colour.measure],
  )

  const setReading = useCallback((photoId: string, reading: HairColourReading) => {
    setState((s) => ({ ...s, colour: { ...s.colour, reading: { photoId, reading } } }))
  }, [])

  const confirmStartingColour = useCallback((starting: StartingColour) => {
    setState((s) => ({ ...s, colour: { ...s.colour, starting } }))
  }, [])

  const setShade = useCallback((shadeId: string) => {
    setState((s) => ({ ...s, colour: { ...s.colour, shadeId, unavailableShadeId: undefined } }))
  }, [])

  const setAnalysisPhoto = useCallback(
    (view: AnalysisView, photo: CapturedPhoto) => {
      const previous = state.analysis.photos[view]
      if (previous?.url !== photo.url) revoke(previous)
      setState((s) => ({
        ...s,
        analysis: {
          ...s.analysis,
          photos: { ...s.analysis.photos, [view]: photo },
          skipped: s.analysis.skipped.filter((v) => v !== view),
        },
      }))
    },
    [state.analysis.photos],
  )

  const skipAnalysisView = useCallback((view: AnalysisView) => {
    setState((s) =>
      s.analysis.skipped.includes(view) ? s : { ...s, analysis: { ...s.analysis, skipped: [...s.analysis.skipped, view] } },
    )
  }, [])

  const setHairSetup = useCallback((hairSetup: HairSetup) => {
    setState((s) => ({ ...s, analysis: { ...s.analysis, hairSetup } }))
  }, [])

  const setSafetyAnswer = useCallback((key: keyof SafetyAnswers, value: boolean) => {
    setState((s) => ({ ...s, safety: { ...s.safety, [key]: value } }))
  }, [])

  const setLiftLevels = useCallback((liftLevels: FlowSettings['liftLevels']) => {
    setState((s) => ({ ...s, settings: { ...s.settings, liftLevels } }))
  }, [])

  const setReveal = useCallback(
    (reveal: RevealRenders) => {
      if (state.colour.reveal?.key !== reveal.key) revokeReveal(state.colour.reveal)
      setState((s) => ({ ...s, colour: { ...s.colour, reveal } }))
    },
    [state.colour.reveal],
  )

  const setMeasure = useCallback(
    (measure: LevelMeasureState) => {
      if (state.colour.measure?.maskUrl !== measure.maskUrl) revokeMeasure(state.colour.measure)
      setState((s) => ({ ...s, colour: { ...s.colour, measure } }))
    },
    [state.colour.measure],
  )

  const setHairProfile = useCallback((key: string, profile: HairProfile) => {
    setState((s) => ({ ...s, analysis: { ...s.analysis, profile: { key, profile } } }))
  }, [])

  const resetAll = useCallback(() => {
    allPhotos(state).forEach(revoke)
    revokeReveal(state.colour.reveal)
    revokeMeasure(state.colour.measure)
    // Settings are preferences, not personal data, so they survive "clear everything".
    setState((s) => ({ colour: {}, analysis: { photos: {}, skipped: [], hairSetup: 'loose' }, safety: {}, settings: s.settings }))
  }, [state])

  const value = useMemo(
    () => ({
      ...state,
      setColourPhoto,
      setReading,
      confirmStartingColour,
      setShade,
      setAnalysisPhoto,
      skipAnalysisView,
      setHairSetup,
      setSafetyAnswer,
      setLiftLevels,
      setReveal,
      setMeasure,
      setHairProfile,
      resetAll,
    }),
    [
      state,
      setColourPhoto,
      setReading,
      confirmStartingColour,
      setShade,
      setAnalysisPhoto,
      skipAnalysisView,
      setHairSetup,
      setSafetyAnswer,
      setLiftLevels,
      setReveal,
      setMeasure,
      setHairProfile,
      resetAll,
    ],
  )

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow must be used inside FlowProvider')
  return ctx
}

/** Confirmed photos for the next features (YouCam calls) to consume. */
export function useCaptureSession(): CaptureSession {
  const { colour, analysis } = useFlow()
  return useMemo(() => ({ colour: colour.photo, analysis }), [colour.photo, analysis])
}
