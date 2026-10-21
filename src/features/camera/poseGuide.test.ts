import { describe, expect, it } from 'vitest'
import { poseFromMatrix } from './headPose'
import { poseGuidance } from './poseGuide'

/** Column-major 4×4 rotation: yaw about Y, then pitch about X (degrees, MediaPipe's camera frame). */
function matrix(yawDeg: number, pitchDeg: number): number[] {
  const y = (yawDeg * Math.PI) / 180
  const p = (pitchDeg * Math.PI) / 180
  const [cy, sy, cp, sp] = [Math.cos(y), Math.sin(y), Math.cos(p), Math.sin(p)]
  // R = Ry · Rx
  const r = [
    [cy, sy * sp, sy * cp],
    [0, cp, -sp],
    [-sy, cy * sp, cy * cp],
  ]
  const m = new Array(16).fill(0)
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) m[col * 4 + row] = r[row][col]
  m[15] = 1
  return m
}

describe('poseFromMatrix', () => {
  it('reads turn and tilt back in degrees, in the user’s own directions', () => {
    const facing = poseFromMatrix(matrix(0, 0))
    expect(facing.turn).toBeCloseTo(0)
    expect(facing.tilt).toBeCloseTo(0)
    // A negative MediaPipe yaw is the user turning to their own right (checked on a docs profile photo).
    expect(poseFromMatrix(matrix(-45, 0)).turn).toBeCloseTo(45)
    expect(poseFromMatrix(matrix(30, 0)).turn).toBeCloseTo(-30)
    // A positive rotation about X here is the head tilted down (checked on docs density photos).
    expect(poseFromMatrix(matrix(0, 35)).tilt).toBeCloseTo(35)
  })
})

describe('poseGuidance', () => {
  const at = (turn: number, tilt = 8) => ({ turn, tilt })

  it('asks for the face when none is found', () => {
    expect(poseGuidance('left45', null)).toMatchObject({ status: 'searching', key: 'no-face' })
    expect(poseGuidance('top', null).text).toMatch(/face just visible/)
  })

  it('left side: turn to your right until about 45°', () => {
    expect(poseGuidance('left45', at(0))).toMatchObject({ status: 'adjust', key: 'turn-more', text: 'Turn more to your right' })
    expect(poseGuidance('left45', at(0)).speech).toMatch(/isn’t at 45 degrees yet/)
    expect(poseGuidance('left45', at(-25)).key).toBe('wrong-way')
    expect(poseGuidance('left45', at(42)).status).toBe('hold')
    expect(poseGuidance('left45', at(60)).key).toBe('turn-back')
  })

  it('right side mirrors the left', () => {
    expect(poseGuidance('right45', at(-10)).text).toBe('Turn more to your left')
    expect(poseGuidance('right45', at(25)).text).toBe('Other way: turn to your left')
    expect(poseGuidance('right45', at(-44)).status).toBe('hold')
  })

  it('front: within a few degrees of straight on, chin level', () => {
    expect(poseGuidance('front', at(2)).status).toBe('hold')
    expect(poseGuidance('front', at(15)).text).toBe('Turn slightly to your left')
    expect(poseGuidance('front', at(-15)).text).toBe('Turn slightly to your right')
    expect(poseGuidance('front', at(0, 35)).key).toBe('chin-up')
    expect(poseGuidance('front', at(0, -20)).key).toBe('chin-down')
  })

  it('hair-dye selfie: straight on, level, face big enough but hair still in frame', () => {
    const selfie = (turn: number, width: number, tilt = 8) => poseGuidance('selfie', { turn, tilt, width })
    expect(selfie(0, 0.55).status).toBe('hold')
    expect(selfie(0, 0.55).speech).toMatch(/card under your chin/)
    expect(selfie(12, 0.55).text).toBe('Turn slightly to your left')
    expect(selfie(0, 0.55, 30).key).toBe('chin-up')
    expect(selfie(0, 0.3).key).toBe('closer')
    expect(selfie(0, 0.85).key).toBe('farther')
    expect(poseGuidance('selfie', null)).toMatchObject({ status: 'searching', key: 'no-face' })
  })

  it('keeps side photos level and well short of a full profile, as YouCam asks', () => {
    expect(poseGuidance('left45', at(50)).key).toBe('turn-back')
    expect(poseGuidance('left45', at(35, 30)).key).toBe('chin-up')
    expect(poseGuidance('left45', at(35, -10)).key).toBe('chin-down')
  })

  it('asks to move closer or back so the face fills about half the photo', () => {
    expect(poseGuidance('front', { turn: 0, tilt: 8, width: 0.3 }).key).toBe('closer')
    expect(poseGuidance('front', { turn: 0, tilt: 8, width: 0.95 }).key).toBe('farther')
    expect(poseGuidance('front', { turn: 0, tilt: 8, width: 0.6 }).status).toBe('hold')
    // A turned face looks narrower, so the side views accept a smaller width.
    expect(poseGuidance('left45', { turn: 35, tilt: 8, width: 0.38 }).status).toBe('hold')
  })

  it('top: head tilted down with the face just visible, not turned', () => {
    expect(poseGuidance('top', at(0, 10)).key).toBe('tilt-more')
    expect(poseGuidance('top', at(0, 38)).status).toBe('hold')
    expect(poseGuidance('top', at(0, 70)).key).toBe('tilt-less')
    expect(poseGuidance('top', at(25, 38)).key).toBe('straight')
  })
})
