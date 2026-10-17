import { describe, expect, it } from 'vitest'
import { DEFAULT_ENGINE_CONFIG, engineConfig, predict, type EngineInput } from './predictionEngine'

const SAFE = { previousReaction: false, blackHenna: false, browsOrLashes: false }

function input(overrides: {
  start?: Partial<EngineInput['start']>
  target?: Partial<EngineInput['target']>
  safety?: EngineInput['safety']
}): EngineInput {
  return {
    start: { level: 4, method: 'suggested', family: 'Brown', previouslyDyed: 'no', ...overrides.start },
    target: { level: 9, tone: 'ash', code: '9.1', name: 'Very light ash blonde', targetHex: '#A9A59F', ...overrides.target },
    safety: overrides.safety ?? SAFE,
  }
}

const ruleIds = (p: ReturnType<typeof predict>) => p.rules.map((r) => r.id)
const warningIds = (p: ReturnType<typeof predict>) => p.warnings.map((w) => w.id)
const actionIds = (p: ReturnType<typeof predict>) => p.actions.map((a) => a.id)

describe('example: natural level 4 → 9.1 ash blonde', () => {
  it('with a two-level lift assumption estimates level 6, three levels short, orange showing', () => {
    const p = predict(input({}), engineConfig({ liftLevels: 2 }))
    expect(p.result).toMatchObject({
      level: 6,
      range: { min: 6, max: 6 },
      levelsShort: 3,
      reachesTarget: false,
      underlyingWarmth: { level: 6, name: 'orange' },
      appearance: 'warm-or-muddy',
      predictedFamily: { family: 'Blonde' },
    })
    expect(p.rules.find((r) => r.id === 'shortfall')!.title).toBe('3 levels short')
    expect(p.status).toBe('professional-recommended')
    expect(p.disclaimer).toMatch(/estimate.*not a guarantee/i)
    expect(p.disclaimer).toMatch(/not scientifically validated/i)
  })

  it('with the default one-level assumption estimates level 5, four short, red-orange showing', () => {
    expect(DEFAULT_ENGINE_CONFIG.liftLevels).toBe(1)
    const p = predict(input({}))
    expect(p.result).toMatchObject({ level: 5, levelsShort: 4, underlyingWarmth: { name: 'red-orange' } })
    expect(p.assumptions.liftLevels).toBe(1)
    expect(p.rules.find((r) => r.id === 'natural-lift')!.detail).toMatch(/setting, not a fact/)
  })

  it('treats ash as an influence, not a guaranteed cancellation', () => {
    const tone = predict(input({})).rules.find((r) => r.id === 'tone-influence')!
    expect(tone.detail).toMatch(/isn’t expected to cancel/)
    expect(predict(input({})).result!.predictedFamily.description).toMatch(/warm or muddy/i)
  })
})

describe('dye history', () => {
  it('previously black-dyed hair targeting lighter brown: no lift promised, professional advised', () => {
    const p = predict(
      input({
        start: { level: 2, previouslyDyed: 'yes', previousDye: 'black-dark', family: 'Black' },
        target: { level: 5, tone: 'neutral', code: '5', name: 'Light brown', targetHex: '#6B5C4B' },
      }),
    )
    expect(p.result).toMatchObject({ level: 2, levelsShort: 3, reachesTarget: false, appearance: 'little-change' })
    expect(ruleIds(p)).toContain('dye-cant-lift-dye')
    expect(warningIds(p)).toContain('black-dyed')
    expect(p.status).toBe('professional-recommended')
  })

  it('previously lightened yellow hair targeting ash: green-tinge warning and strand test', () => {
    const p = predict(
      input({
        start: { level: 9, previouslyDyed: 'yes', previousDye: 'lightened', family: 'Blonde' },
        target: { level: 8, tone: 'ash', code: '8.1', name: 'Ash light blonde', targetHex: '#96938C' },
      }),
    )
    expect(p.result).toMatchObject({ level: 8, reachesTarget: true, appearance: 'possible-green' })
    expect(p.result!.underlyingWarmth).toEqual({ level: 8, name: 'gold' })
    expect(warningIds(p)).toContain('ash-green')
    expect(actionIds(p)).toContain('strand-test')
  })

  it('unknown dye history gives a range and medium uncertainty', () => {
    const p = predict(input({ start: { level: 5, previouslyDyed: 'unsure' }, target: { level: 7, tone: 'neutral' } }))
    expect(p.result).toMatchObject({ level: 5, range: { min: 5, max: 6 } })
    expect(p.uncertainty.level).toBe('medium')
  })
})

describe('lift limits', () => {
  it('semi- and demi-permanent box colour adds tone but is not expected to lighten', () => {
    for (const permanence of ['semi-permanent', 'demi-permanent']) {
      const p = predict(input({ target: { level: 6, tone: 'red', permanence } }), engineConfig({ liftLevels: 2 }))
      expect(p.result).toMatchObject({ level: 4, levelsShort: 2, appearance: 'little-change' })
      expect(ruleIds(p)).toContain('deposit-only')
      expect(ruleIds(p)).not.toContain('natural-lift')
    }
    // Permanent (or not stated) keeps the normal lift assumption.
    expect(predict(input({ target: { level: 6, tone: 'red', permanence: 'permanent' } }), engineConfig({ liftLevels: 2 })).result?.level).toBe(6)
    // Going darker or the same level still works as deposit.
    expect(predict(input({ target: { level: 3, tone: 'red', permanence: 'semi-permanent' } })).result?.reachesTarget).toBe(true)
  })

  it('a target within the assumed lift is reached', () => {
    const p = predict(input({ start: { level: 6 }, target: { level: 7, tone: 'ash', targetHex: '#84817A' } }))
    expect(p.result).toMatchObject({ level: 7, levelsShort: 0, reachesTarget: true, appearance: 'as-box' })
    expect(p.result!.displayHex).toBe('#84817A')
    expect(p.status).toBe('estimate')
    expect(actionIds(p)).not.toContain('see-professional')
  })

  it('a target beyond the assumed lift falls short and is flagged', () => {
    const p = predict(input({ start: { level: 6 }, target: { level: 9, tone: 'golden' } }))
    expect(p.result).toMatchObject({ level: 7, levelsShort: 2, appearance: 'warmer-than-box' })
    expect(warningIds(p)).toContain('beyond-lift')
    expect(actionIds(p)).toEqual(expect.arrayContaining(['closer-shade', 'strand-test']))
    expect(p.status).toBe('professional-recommended')
  })

  it('one level short is a caution, not a referral', () => {
    const p = predict(input({ start: { level: 6 }, target: { level: 8, tone: 'neutral' } }))
    expect(p.result!.levelsShort).toBe(1)
    expect(p.status).toBe('estimate')
  })

  it('a result that matches the target level: going darker', () => {
    const p = predict(input({ start: { level: 5 }, target: { level: 3, tone: 'neutral', targetHex: '#483B2C' } }))
    expect(p.result).toMatchObject({ level: 3, levelsShort: 0, reachesTarget: true, underlyingWarmth: null })
    expect(ruleIds(p)).toContain('deposit')
    expect(warningIds(p)).toContain('dark-hard-to-undo')
  })
})

describe('starting level', () => {
  it('missing level: no result, high uncertainty, asks to confirm', () => {
    const p = predict(input({ start: { level: undefined } }))
    expect(p.status).toBe('insufficient-input')
    expect(p.result).toBeNull()
    expect(p.uncertainty.level).toBe('high')
    expect(actionIds(p)[0]).toBe('confirm-level')
  })

  it('uses a user-adjusted level and says so', () => {
    const suggested = predict(input({ start: { level: 4, method: 'suggested' } }))
    const adjusted = predict(input({ start: { level: 5, method: 'adjusted' } }))
    expect(suggested.result!.level).toBe(5)
    expect(adjusted.result!.level).toBe(6)
    expect(adjusted.rules[0]).toMatchObject({ id: 'user-level' })
    expect(adjusted.rules[0].detail).toMatch(/level 5/)
  })

  it('grey hair raises uncertainty', () => {
    expect(predict(input({ start: { family: 'Grey/White' } })).uncertainty.level).toBe('medium')
  })
})

describe('safety', () => {
  it('blocks after a previous reaction, without diagnosing anything', () => {
    const p = predict(input({ safety: { ...SAFE, previousReaction: true } }))
    expect(p.status).toBe('blocked')
    expect(warningIds(p)).toContain('previous-reaction')
    expect(actionIds(p)).toContain('pharmacist')
    expect(actionIds(p)).not.toContain('skin-test') // no "go ahead" steps when blocked
    const text = p.warnings.map((w) => w.text).join(' ')
    expect(text).not.toMatch(/you are allergic|diagnos|safe for you/i)
  })

  it('blocks for black henna history and for eyebrow or eyelash use', () => {
    expect(predict(input({ safety: { ...SAFE, blackHenna: true } })).status).toBe('blocked')
    const brows = predict(input({ safety: { ...SAFE, browsOrLashes: true } }))
    expect(brows.status).toBe('blocked')
    expect(brows.warnings.find((w) => w.id === 'brows-lashes')!.sourceIds).toContain('fda-hair-dyes')
  })

  it('reminds about the skin test and asks unanswered safety questions', () => {
    const p = predict(input({ safety: {} }))
    expect(warningIds(p)).toEqual(expect.arrayContaining(['safety-unanswered', 'skin-test']))
    expect(actionIds(p)).toContain('answer-safety')
  })
})

describe('config', () => {
  it('rejects invalid lift assumptions', () => {
    expect(() => engineConfig({ liftLevels: -1 })).toThrow(RangeError)
    expect(() => engineConfig({ liftLevels: 1.5 })).toThrow(RangeError)
    expect(engineConfig({ liftLevels: 3 }).liftLevels).toBe(3)
  })

  it('uses the configurable warmth table', () => {
    const table = { ...DEFAULT_ENGINE_CONFIG.warmthTable, 5: { name: 'test-warmth', ab: [1, 1] as const } }
    expect(predict(input({}), engineConfig({ warmthTable: table })).result!.underlyingWarmth!.name).toBe('test-warmth')
  })

  it('is deterministic', () => {
    expect(predict(input({}))).toEqual(predict(input({})))
  })
})
