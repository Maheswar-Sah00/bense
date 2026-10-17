import { describe, expect, it } from 'vitest'
import { recommend } from './alternatives'
import { engineConfig, predict, type EngineInput } from './predictionEngine'
import { explainResult } from './resultExplanation'
import { findShade } from './shadeCatalogue'

const ash9 = findShade('dev-9-1-very-light-ash-blonde')!
const safe = { previousReaction: false, blackHenna: false, browsOrLashes: false }

function explain(start: Partial<EngineInput['start']>, shade = ash9, safety = safe, lift = 1) {
  const input = { start: { level: 4, previouslyDyed: 'no', method: 'manual', ...start }, safety } as Omit<EngineInput, 'target'>
  const config = engineConfig({ liftLevels: lift })
  const target = { level: shade.level, tone: shade.tone, code: shade.code, name: shade.name, targetHex: shade.targetHex }
  return explainResult({
    prediction: predict({ ...input, target }, config),
    startLevel: input.start.level ?? null,
    target,
    recommendation: recommend(input, shade, config),
  }).join(' ')
}

describe('explainResult', () => {
  it('natural brown to very light ash: says where the hair lands, how far short, why it goes warm, and what to do', () => {
    const text = explain({ level: 4 })
    expect(text).toContain('Your hair is about level 4 out of 10, medium brown.')
    expect(text).toContain('Box dye can only make natural hair about 1 level lighter. So from level 4, you’ll likely get to about level 5.')
    expect(text).toContain('That is 4 levels darker than the picture on the box.')
    expect(text).toContain('warm red-orange colours come through. The ash in this box can’t hide all of it')
    expect(text).toContain('A better choice for your hair is')
    expect(text).toContain('see a hair colourist')
    expect(text).toMatch(/skin test/)
  })

  it('follows the lift setting', () => {
    expect(explain({ level: 4 }, ash9, safe, 2)).toContain('about 2 levels lighter. So from level 4, you’ll likely get to about level 6.')
  })

  it('dyed hair: explains that dye can’t lighten dye', () => {
    const text = explain({ level: 2, previouslyDyed: 'yes', previousDye: 'black-dark' }, findShade('dev-5-0-light-brown')!)
    expect(text).toContain('A new box dye can’t make old dye lighter')
    expect(text).toContain('stay about as light as it is now')
  })

  it('a box within reach says it fits', () => {
    const text = explain({ level: 6 }, findShade('dev-7-0-medium-blonde')!)
    expect(text).toContain('That matches the box')
    expect(text).toContain('good fit')
    expect(text).not.toContain('colourist')
  })

  it('a safety stop replaces the colour talk', () => {
    const text = explain({ level: 4 }, ash9, { ...safe, previousReaction: true })
    expect(text).toContain('because you have reacted to hair dye before')
    expect(text).toContain('pharmacist or a doctor')
    expect(text).not.toContain('level 5')
  })
})
