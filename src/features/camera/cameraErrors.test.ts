import { describe, expect, it } from 'vitest'
import { classifyCameraError } from './cameraErrors'

const domError = (name: string) => Object.assign(new Error(name), { name })

describe('classifyCameraError', () => {
  it('maps getUserMedia failures to user-facing issues', () => {
    expect(classifyCameraError(domError('NotAllowedError'))).toBe('denied')
    expect(classifyCameraError(domError('NotFoundError'))).toBe('no-camera')
    expect(classifyCameraError(domError('OverconstrainedError'))).toBe('no-camera')
    expect(classifyCameraError(domError('NotReadableError'))).toBe('in-use')
    expect(classifyCameraError(domError('Weird'))).toBe('unknown')
    expect(classifyCameraError('not an error')).toBe('unknown')
  })
})
