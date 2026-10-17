// General cosmetic care tips chosen from the measured hair profile. Data-driven and deliberately
// cautious: photos can't measure porosity, strand thickness, scalp health or damage, and nothing
// here is medical or professional advice.
import type { HairMetric, HairProfile } from './hairProfile'

export interface CareContext {
  profile?: HairProfile
  /** True if the hair has been dyed before, or the user is planning a box dye. */
  colourTreated?: boolean
}

export interface CareTip {
  id: string
  kind: 'cosmetic' | 'professional'
  title: string
  text: string
  /** Which measurement or choice triggered the tip, shown so users see why. */
  because: string
}

interface CareRule extends CareTip {
  applies: (ctx: CareContext) => boolean
}

function measured<K extends HairMetric>(p: HairProfile | undefined, key: K): HairProfile[K]['value'] {
  const m = p?.[key]
  return m?.status === 'measured' ? (m.value as HairProfile[K]['value']) : undefined
}

export const CARE_RULES: CareRule[] = [
  {
    id: 'colour-safe-wash',
    kind: 'cosmetic',
    title: 'Colour-safe washing',
    text: 'Colour-treated hair often keeps its colour longer with a gentle, colour-safe shampoo and cooler water. Washing a little less often may help too.',
    because: 'Your hair is dyed, or you’re planning to dye it',
    applies: (c) => !!c.colourTreated,
  },
  {
    id: 'frizz-high',
    kind: 'cosmetic',
    title: 'Taming frizz',
    text: 'Conditioning after every wash and a smoothing leave-in may help. Using heat protection before heat styling is a good habit.',
    because: 'Frizz measured as frizzy or extremely frizzy',
    applies: (c) => (measured(c.profile, 'frizz')?.mapping ?? 0) >= 2,
  },
  {
    id: 'frizz-light',
    kind: 'cosmetic',
    title: 'A little smoothing',
    text: 'A light conditioner or a small amount of smoothing cream on the lengths may be enough for light frizz.',
    because: 'Frizz measured as slightly frizzy',
    applies: (c) => measured(c.profile, 'frizz')?.mapping === 1,
  },
  {
    id: 'curls-leave-in',
    kind: 'cosmetic',
    title: 'Lightweight leave-in for curls and coils',
    text: 'Curly and coily hair often does well with a lightweight leave-in on damp hair and gentle detangling with fingers or a wide-tooth comb.',
    because: 'Hair type measured in the curly or coily range',
    applies: (c) => (measured(c.profile, 'type')?.index ?? 0) >= 4,
  },
  {
    id: 'wavy-light',
    kind: 'cosmetic',
    title: 'Keeping waves light',
    text: 'Light, water-based products tend to suit waves better than heavy creams, which can weigh them down.',
    because: 'Hair type measured in the wavy range',
    applies: (c) => {
      const i = measured(c.profile, 'type')?.index
      return i !== undefined && i >= 1 && i <= 3
    },
  },
  {
    id: 'low-density-volume',
    kind: 'cosmetic',
    title: 'Light styling for volume',
    text: 'Lightweight products and lifting at the roots while drying can add the look of volume. Heavy oils and butters may flatten hair.',
    because: 'Density measured as low or extremely low',
    applies: (c) => (measured(c.profile, 'density')?.level ?? 4) <= 2,
  },
  {
    id: 'long-ends',
    kind: 'cosmetic',
    title: 'Caring for longer lengths',
    text: 'On longer hair, focus conditioner on the mid-lengths and ends, where hair is oldest.',
    because: 'Length measured at chest length or longer',
    applies: (c) => (measured(c.profile, 'length')?.index ?? 0) >= 5,
  },
  {
    id: 'density-professional',
    kind: 'professional',
    title: 'If you’ve noticed thinning',
    text: 'A photo can’t tell why hair looks less dense, and this isn’t a diagnosis. If you’ve noticed new thinning or shedding that worries you, a doctor or dermatologist can help.',
    because: 'Density measured as low or extremely low',
    applies: (c) => (measured(c.profile, 'density')?.level ?? 4) <= 2,
  },
]

export const CARE_DISCLAIMER =
  'General cosmetic tips, not professional or medical advice. Photos can’t measure porosity, strand thickness, scalp health or damage.'

export function careTips(ctx: CareContext): CareTip[] {
  return CARE_RULES.filter((rule) => rule.applies(ctx)).map(({ id, kind, title, text, because }) => ({
    id,
    kind,
    title,
    text,
    because,
  }))
}

/**
 * Note for the dye result when the profile suggests long or thick hair. We have no validated
 * per-product quantity rules, so this points to the box instructions instead of a box count.
 */
export function quantityNote(profile: HairProfile | undefined): string | null {
  const longHair = (measured(profile, 'length')?.index ?? 0) >= 5
  const thickHair = measured(profile, 'density')?.level === 4
  if (!longHair && !thickHair) return null
  const what = longHair && thickHair ? 'long, dense hair' : longHair ? 'longer hair' : 'dense hair'
  return `Your profile shows ${what}. Check the box instructions for how much product to use before you start; we don’t estimate quantities.`
}
