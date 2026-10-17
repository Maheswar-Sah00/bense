import { describe, expect, it } from 'vitest'
import type { StartingColour } from '../../shared/domain/hairColourReading'
import type { CapturedPhoto } from './captureSession'
import { colourResumePath } from './flow'

const photo = { view: 'colour', url: 'blob:x' } as CapturedPhoto
const starting: StartingColour = { confirmedLevel: 6, method: 'manual', previouslyDyed: 'no' }

describe('colour resume path', () => {
  it('sends the colour flow to the first unfinished step', () => {
    expect(colourResumePath({})).toBe('/colour/photo')
    expect(colourResumePath({ photo })).toBe('/colour/starting-colour')
    expect(colourResumePath({ photo, starting })).toBe('/colour/shade')
    expect(colourResumePath({ photo, starting, shadeId: '7.1' })).toBe('/colour/result')
  })
})
