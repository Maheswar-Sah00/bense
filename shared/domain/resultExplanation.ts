// The result in plain words, for reading on screen and out loud. Built only from the prediction,
// the same data the rest of the result page shows, so the explanation can't disagree with it.
import type { Recommendation } from './alternatives'
import { HAIR_LEVEL_NAMES } from './hairLevel'
import type { HairLevel } from './hairLevel'
import type { Prediction } from './predictionEngine'
import { TONE_LABELS, type ToneFamily } from './shadeCatalogue'

export interface ExplainInput {
  prediction: Prediction
  startLevel: HairLevel | null
  target: { level: HairLevel; tone: ToneFamily; code: string; name: string }
  recommendation: Recommendation
}

const levels = (n: number) => `${n} level${n === 1 ? '' : 's'}`
const levelName = (level: HairLevel) => HAIR_LEVEL_NAMES[level].toLowerCase()

/** A few short sentences: where your hair is, what the box can do, what you'll likely get, what to do. */
export function explainResult({ prediction, startLevel, target, recommendation }: ExplainInput): string[] {
  const has = (id: string) => prediction.warnings.some((w) => w.id === id)

  if (prediction.status === 'blocked') {
    const reasons = [
      has('previous-reaction') && 'you have reacted to hair dye before',
      has('black-henna') && 'you have used black henna',
      has('brows-lashes') && 'you want to use it on your eyebrows or eyelashes',
    ].filter(Boolean)
    return [
      `Please don’t dye your hair at home with this box, because ${reasons.join(' and ')}.`,
      has('brows-lashes')
        ? 'Hair dye is not made for eyebrows or eyelashes, and it can hurt your eyes.'
        : 'That makes a bad reaction more likely, even if it went fine before.',
      'Talk to a pharmacist or a doctor before you use any hair dye.',
    ]
  }

  const result = prediction.result
  if (!result || !startLevel) return ['First tell us how light your hair is now. Then we can tell you what this box will do.']

  const rule = (id: string) => prediction.rules.some((r) => r.id === id)
  const lines: string[] = [
    `Your hair is about level ${startLevel} out of 10, ${levelName(startLevel)}. Level 1 is black and 10 is the lightest blonde.`,
    `The box shows level ${target.level}, ${target.name.toLowerCase()}.`,
  ]

  if (target.level < startLevel) {
    lines.push('The box is darker than your hair. Dye can always make hair darker, so you should get close to the picture.')
  } else if (target.level === startLevel) {
    lines.push('The box is as light as your hair already is, so it mostly changes the shade, not how light it is.')
  } else if (rule('dye-cant-lift-dye')) {
    lines.push(
      'Your hair has been dyed before. A new box dye can’t make old dye lighter. Only bleach or a colour remover can.',
      'So your hair will likely stay about as light as it is now.',
    )
  } else if (rule('deposit-only')) {
    lines.push(
      'This box is a semi or demi-permanent colour. It adds colour, but it isn’t made to make hair lighter.',
      'So your hair will likely stay about as light as it is now.',
    )
  } else if (rule('dye-history-unknown')) {
    lines.push(
      `You’re not sure if your hair was dyed before. If it’s natural, it may get to about level ${result.range.max}. If it was dyed, it may not get lighter at all.`,
    )
  } else {
    lines.push(
      `Box dye can only make natural hair about ${levels(prediction.assumptions.liftLevels)} lighter. So from level ${startLevel}, you’ll likely get to about level ${result.level}.`,
    )
  }

  if (target.level > startLevel) {
    lines.push(
      result.reachesTarget
        ? 'That matches the box, so the result should look close to the picture.'
        : `That is ${levels(result.levelsShort)} darker than the picture on the box.`,
    )
  }

  const warmth = result.underlyingWarmth?.name ?? 'warm'
  const tone = TONE_LABELS[target.tone].toLowerCase()
  if (result.appearance === 'warm-or-muddy') {
    lines.push(
      `When dark hair gets lighter, warm ${warmth} colours come through. The ${tone} in this box can’t hide all of it, so it may look warm or muddy instead of cool.`,
    )
  } else if (result.appearance === 'warmer-than-box') {
    lines.push(`When dark hair gets lighter, warm ${warmth} colours come through, so it will likely look warmer than the box.`)
  } else if (result.appearance === 'possible-green') {
    lines.push('Ash colour on hair that was lightened before can turn a little green. Try it on a small hidden strand first.')
  }

  if (recommendation.kind === 'closer-shades' && recommendation.shades[0]) {
    const better = recommendation.shades[0].shade
    lines.push(`A better choice for your hair is ${better.code}, ${better.name}. It should reach its own colour on you.`)
  }
  if (recommendation.professional) {
    lines.push(`If you really want ${target.name.toLowerCase()}, see a hair colourist. They can lighten your hair safely first.`)
  } else if (recommendation.kind === 'on-target') {
    lines.push(
      has('safety-unanswered')
        ? 'For your hair colour, this box looks like a good fit. Please go through the safety check below before you decide.'
        : 'This box looks like a good fit for your hair.',
    )
  }

  lines.push('This is an estimate, not a promise. Always do the skin test from the box 48 hours before you dye.')
  return lines
}
