import { describe, expect, it } from 'vitest'
import { recommend } from '../domain/alternatives'
import { engineConfig } from '../domain/predictionEngine'
import { revealSentence } from '../domain/revealSentence'
import { checkRecordedProfile, DEMO_HAIR_PROFILE, scenarioPrediction, verifiedRenderPair } from './fixtures'
import { DEMO_SCENARIOS, findScenario } from './scenarios'

describe('demo scenarios (inputs only; results come from the production engine)', () => {
  it.each(DEMO_SCENARIOS.map((s) => [s.letter, s] as const))('scenario %s still demonstrates what it claims', (_, scenario) => {
    const { prediction } = scenarioPrediction(scenario)
    const d = scenario.demonstrates
    expect(prediction.status).toBe(d.status)
    expect(prediction.result!.level).toBe(d.predictedLevel)
    expect(prediction.result!.levelsShort).toBe(d.levelsShort)
    const ruleIds = prediction.rules.map((r) => r.id)
    for (const id of d.ruleIds) expect(ruleIds).toContain(id)
    const warningIds = prediction.warnings.map((w) => w.id)
    for (const id of d.warningIds ?? []) expect(warningIds).toContain(id)
  })

  it('A: level 4 + very light ash 9 with a 2-level lift reaches level 6, 3 short, warm through the ash', () => {
    const { prediction, shade } = scenarioPrediction(findScenario('brass-surprise')!)
    expect(revealSentence(prediction, shade)).toBe('Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short.')
    expect(prediction.result!.appearance).toBe('warm-or-muddy')
  })

  it('B: dyed black does not lift and exposes no new warmth', () => {
    const { prediction } = scenarioPrediction(findScenario('dye-on-dye')!)
    expect(prediction.result!.appearance).toBe('little-change')
    expect(prediction.rules.map((r) => r.id)).not.toContain('underlying-warmth')
  })

  it('C: ash over lightened hair flags the green risk, and the recommendation avoids ash', () => {
    const scenario = findScenario('green-risk')!
    const { prediction, input, shade } = scenarioPrediction(scenario)
    expect(prediction.result!.appearance).toBe('possible-green')
    const rec = recommend({ start: input.start, safety: input.safety }, shade, engineConfig({ liftLevels: scenario.liftLevels }))
    expect(rec.kind).toBe('closer-shades')
    expect(rec.shades[0].shade.tone).not.toBe('ash')
  })

  it('every scenario has a recommendation (professional and/or a closer shade)', () => {
    for (const scenario of DEMO_SCENARIOS) {
      const { input, shade } = scenarioPrediction(scenario)
      const rec = recommend({ start: input.start, safety: input.safety }, shade, engineConfig({ liftLevels: scenario.liftLevels }))
      expect(rec.professional || rec.shades.length > 0).toBe(true)
    }
  })

  it('changing the starting level changes the prediction (nothing is hardcoded)', () => {
    const a = findScenario('brass-surprise')!
    expect(scenarioPrediction(a, 5).prediction.result!.level).toBe(7)
    expect(scenarioPrediction(a, 3).prediction.result!.level).toBe(5)
  })
})

describe('demo fixtures', () => {
  it('the render pair is only offered when it matches the engine’s colours', () => {
    const a = findScenario('brass-surprise')!
    const { prediction, shade } = scenarioPrediction(a)
    expect(verifiedRenderPair(a, shade, prediction)).not.toBeNull()
    // A different starting level predicts a different colour, so the recorded pair is withheld.
    const other = scenarioPrediction(a, 5)
    expect(verifiedRenderPair(a, other.shade, other.prediction)).toBeNull()
    // Scenarios without a genuine sample render get none.
    for (const id of ['dye-on-dye', 'green-risk']) {
      const s = findScenario(id)!
      const p = scenarioPrediction(s)
      expect(verifiedRenderPair(s, p.shade, p.prediction)).toBeNull()
    }
  })

  it('the recorded hair profile is labelled and holds only documented YouCam values', () => {
    expect(DEMO_HAIR_PROFILE.provenance).toMatch(/not your hair/)
    expect(DEMO_HAIR_PROFILE.provenance).toMatch(/live YouCam/)
    expect(checkRecordedProfile(DEMO_HAIR_PROFILE.profile)).toEqual([])
  })
})
