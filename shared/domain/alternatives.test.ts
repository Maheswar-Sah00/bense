import { describe, expect, it } from 'vitest'
import { recommend } from './alternatives'
import { engineConfig, predict, type EngineInput } from './predictionEngine'
import { findShade, SHADES } from './shadeCatalogue'

const ash9 = findShade('dev-9-1-very-light-ash-blonde')!
const natural = (level: EngineInput['start']['level'], extra: Partial<EngineInput['start']> = {}): Omit<EngineInput, 'target'> => ({
  start: { level, previouslyDyed: 'no', method: 'manual', ...extra },
  safety: { previousReaction: false, blackHenna: false, browsOrLashes: false },
})

describe('recommend', () => {
  it('dark brown to very light ash: professional first, then the lightest shades a box can reach', () => {
    const r = recommend(natural(3), ash9, engineConfig({ liftLevels: 1 }))
    expect(r.professional).toBe(true)
    expect(r.kind).toBe('closer-shades')
    // Same level first, then the tones closest to ash.
    expect(r.shades.map((a) => a.shade.id)).toEqual(['dev-4-1-ash-brown', 'dev-4-8-mocha-brown', 'dev-4-0-medium-brown'])
    expect(r.shades[0].reason).toBe('Within the 1-level lift we assume from your level 3.')
  })

  it('suggests from the same shelf: a real product gets the same brand and market, never example shades', () => {
    const real = SHADES.find((s) => s.brand && s.level >= 8 && s.tone === 'ash')!
    const r = recommend(natural(3), real, engineConfig({ liftLevels: 1 }))
    expect(r.shades.length).toBeGreaterThan(0)
    for (const a of r.shades) expect(a.shade.brand).toMatchObject({ name: real.brand!.name, market: real.brand!.market })
    expect(recommend(natural(3), ash9).shades.every((a) => !a.shade.brand)).toBe(true)
  })

  it('follows the lift setting: with 3 levels the closest ash shade becomes reachable', () => {
    const r = recommend(natural(3), ash9, engineConfig({ liftLevels: 3 }))
    expect(r.shades[0].shade.id).toBe('dev-6-1-ash-dark-blonde')
  })

  it('every suggestion is predicted by the same engine to reach its own box level', () => {
    for (const lift of [1, 2, 3]) {
      const config = engineConfig({ liftLevels: lift })
      for (const a of recommend(natural(4), ash9, config).shades) {
        const p = predict({ ...natural(4), target: { level: a.shade.level, tone: a.shade.tone, targetHex: a.shade.targetHex } }, config)
        expect(p.status).toBe('estimate')
        expect(p.result!.reachesTarget).toBe(true)
        expect(a.shade.level).toBeLessThanOrEqual(4 + lift)
      }
    }
  })

  it('suggests nothing after a safety stop answer', () => {
    const r = recommend({ ...natural(3), safety: { previousReaction: true } }, ash9)
    expect(r.kind).toBe('blocked')
    expect(r.shades).toEqual([])
  })

  it('needs no alternative when the box is within reach', () => {
    const r = recommend(natural(8), ash9, engineConfig({ liftLevels: 1 }))
    expect(r.kind).toBe('on-target')
    expect(r.professional).toBe(false)
  })

  it('never suggests ash over lightened hair (green risk)', () => {
    const r = recommend(natural(7, { previouslyDyed: 'yes', previousDye: 'lightened' }), ash9)
    expect(r.professional).toBe(true)
    expect(r.shades.length).toBeGreaterThan(0)
    expect(r.shades.every((a) => a.shade.tone !== 'ash' && a.shade.level <= 7)).toBe(true)
  })
})
