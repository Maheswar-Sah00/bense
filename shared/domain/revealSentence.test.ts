import { describe, expect, it } from 'vitest'
import { engineConfig, predict, type EngineInput } from './predictionEngine'
import { revealSentence } from './revealSentence'

const SAFE = { previousReaction: false, blackHenna: false, browsOrLashes: false }
const input = (start: Partial<EngineInput['start']>, target: EngineInput['target']): EngineInput => ({
  start: { level: 4, previouslyDyed: 'no', ...start },
  target,
  safety: SAFE,
})

describe('revealSentence', () => {
  it('is generated from the prediction: level, colour words, promise and gap', () => {
    const target = { level: 9, tone: 'ash' } as const
    const p = predict(input({}, target), engineConfig({ liftLevels: 2 }))
    expect(revealSentence(p, target)).toBe('Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short.')
    const p1 = predict(input({}, target))
    expect(revealSentence(p1, target)).toBe('Predicted level 5 red-orange brown versus promised level 9 ash: 4 levels short.')
  })

  it('says on target when the level is reached', () => {
    const target = { level: 7, tone: 'ash' } as const
    expect(revealSentence(predict(input({ level: 6 }, target)), target)).toBe(
      'Predicted level 7 ash blonde versus promised level 7 ash: on target.',
    )
  })

  it('shows a range when dye history is unknown, and handles a missing level', () => {
    const target = { level: 7, tone: 'neutral' } as const
    expect(revealSentence(predict(input({ level: 5, previouslyDyed: 'unsure' }, target)), target)).toMatch(
      /^Predicted level 5–6 .* versus promised level 7 natural: 2 levels short\.$/,
    )
    expect(revealSentence(predict(input({ level: undefined }, target)), target)).toMatch(/need your starting level/)
  })
})
