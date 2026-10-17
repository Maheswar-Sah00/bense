import { describe, expect, it } from 'vitest'
import { normaliseColourTones, type StartingColour } from './hairColourReading'
import { predict } from './predictionEngine'
import { buildPredictionInput, toEngineInput } from './predictionInput'

const reading = normaliseColourTones({ color: { hair_color: '#B56637', hair_color_name: 'Auburn' } })
const starting: StartingColour = {
  confirmedLevel: 6,
  method: 'corrected',
  previouslyDyed: 'yes',
  reading,
  correctedFamily: 'Blonde',
}

describe('buildPredictionInput', () => {
  it('links the confirmed start, dye history and selected shade', () => {
    const result = buildPredictionInput(starting, 'dev-8-1-ash-light-blonde')
    expect(result).toEqual({
      ok: true,
      input: {
        starting: { level: 6, previouslyDyed: 'yes', method: 'corrected', family: 'Blonde' },
        target: {
          shadeId: 'dev-8-1-ash-light-blonde',
          code: '8.1',
          name: 'Ash light blonde',
          level: 8,
          tone: 'ash',
          targetHex: '#9C9283',
          limitationIds: ['swatch-approximation', 'lift-limit', 'dye-cant-lift-dye', 'warm-exposure', 'ash-green'],
        },
        levelChange: 2,
        render: { promise: { pattern: { name: 'full' }, palettes: [{ color: '#9C9283', color_intensity: 100 }] } },
        catalogue: { version: 'dev-2026-10-16', status: 'illustrative' },
      },
    })
  })

  it('uses the reading family when there was no correction, and null when manual', () => {
    const fromReading = buildPredictionInput({ ...starting, correctedFamily: undefined }, 'dev-3-0-dark-brown')
    expect(fromReading.ok && fromReading.input.starting.family).toBe('Auburn')
    const manual = buildPredictionInput({ confirmedLevel: 4, method: 'manual', previouslyDyed: 'no' }, 'dev-3-0-dark-brown')
    expect(manual.ok && manual.input.starting.family).toBeNull()
    expect(manual.ok && manual.input.levelChange).toBe(-1)
  })

  it('reports missing and unavailable selections instead of guessing', () => {
    expect(buildPredictionInput(undefined, 'dev-3-0-dark-brown')).toEqual({ ok: false, reason: 'missing-starting' })
    expect(buildPredictionInput(starting, undefined)).toEqual({ ok: false, reason: 'missing-shade' })
    expect(buildPredictionInput(starting, '7.1')).toEqual({ ok: false, reason: 'unknown-shade', shadeId: '7.1' })
  })
})

describe('session → engine', () => {
  it('feeds the selected shade and confirmed start into the engine', () => {
    const built = buildPredictionInput(
      { confirmedLevel: 4, method: 'adjusted', previouslyDyed: 'no' },
      'dev-9-1-very-light-ash-blonde',
    )
    if (!built.ok) throw new Error('expected input')
    const engineInput = toEngineInput(built.input, { previousReaction: false, blackHenna: false, browsOrLashes: false })
    expect(engineInput.target).toMatchObject({ level: 9, tone: 'ash', code: '9.1' })
    expect(engineInput.start).toMatchObject({ level: 4, method: 'adjusted', previouslyDyed: 'no' })
    expect(predict(engineInput).result).toMatchObject({ level: 5, levelsShort: 4 })
  })

  it('drops a stale previous-dye detail when the hair is not dyed', () => {
    const built = buildPredictionInput(
      { confirmedLevel: 4, method: 'manual', previouslyDyed: 'no', previousDye: 'black-dark' },
      'dev-5-0-light-brown',
    )
    expect(built.ok && built.input.starting.previousDye).toBeUndefined()
  })
})
