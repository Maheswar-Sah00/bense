import type { AnalysisView, HairMetric, HairSetup } from '../../state/captureSession'
import type { CaptureGuide } from '../camera/PhotoCapture'

export const VIEW_INFO: Record<AnalysisView, { slug: string; label: string; instruction: string }> = {
  front: { slug: 'front', label: 'Front', instruction: 'Look straight at the camera.' },
  left45: {
    slug: 'left-45',
    label: 'Your left side',
    instruction: 'Turn your head about 45° to your right, so your left side faces the camera.',
  },
  right45: {
    slug: 'right-45',
    label: 'Your right side',
    instruction: 'Turn your head about 45° to your left, so your right side faces the camera.',
  },
  top: {
    slug: 'top',
    label: 'Top, tilted down',
    instruction: 'Lower your head about 45° so your hairline shows.',
  },
}

export const METRIC_LABELS: Record<HairMetric, string> = {
  type: 'Hair type',
  frizz: 'Frizz',
  length: 'Length',
  density: 'Density',
}

/**
 * Hair setups. Loose is the default and isn't asked about: the photos tell everyone to wear
 * their hair down and forward, and Length measures long vs short from the front photo. The
 * other setups can't be seen by any YouCam API, so the user can pick one if it applies.
 * ('short' is still a valid server setup; it runs exactly the same plan as 'loose'.)
 */
export const HAIR_SETUP_OPTIONS: { value: HairSetup; label: string; tip: string }[] = [
  {
    value: 'loose',
    label: 'No, my hair is loose (or short)',
    tip: 'Let it down and bring it forward over your shoulders. Short hair: leave it natural.',
  },
  {
    value: 'tied',
    label: 'Tied up and can’t let it down',
    tip: 'We’ll only measure density. Type, frizz and length need your hair down.',
  },
  {
    value: 'protective',
    label: 'Braids, locs or twists',
    tip: 'We’ll skip type, frizz and density, which these styles would distort. Length describes your current style.',
  },
  {
    value: 'covered',
    label: 'Wig, scarf or covering',
    tip: 'We can’t measure natural hair under a wig or covering, so no hair measurements will run. Hair colour still works.',
  },
]

export const setupOption = (setup: HairSetup) =>
  HAIR_SETUP_OPTIONS.find((o) => o.value === setup) ?? HAIR_SETUP_OPTIONS[0]

export function viewFromSlug(slug: string | undefined): AnalysisView | undefined {
  return (Object.keys(VIEW_INFO) as AnalysisView[]).find((view) => VIEW_INFO[view].slug === slug)
}

export const viewPath = (view: AnalysisView) => `/analysis/photos/${VIEW_INFO[view].slug}`

const OVERLAYS = { front: 'face', left45: 'turn-right', right45: 'turn-left', top: 'top' } as const

export function analysisGuide(view: AnalysisView, setup: HairSetup): CaptureGuide {
  const setupTip = setupOption(setup).tip
  return {
    overlay: OVERLAYS[view],
    why: 'Stays on this phone until you ask for an analysis. Never stored or logged.',
    tips: [
      { icon: 'profile', title: VIEW_INFO[view].label, text: VIEW_INFO[view].instruction },
      { icon: 'sparkle', title: 'Your hair', text: setupTip },
      { icon: 'sun', title: 'Even light', text: 'Dry hair, no backlight' },
    ],
    reviewChecks:
      view === 'top'
        ? ['Your hairline and parting are visible', 'The photo is sharp']
        : ['Your hair is visible, not cropped off', 'Your head is turned as shown', 'The photo is sharp'],
  }
}
