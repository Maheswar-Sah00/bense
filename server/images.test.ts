import { describe, expect, it } from 'vitest'
import { readImageInfo } from './images'

function jpeg(width: number, height: number) {
  const sof = [0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3]
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, ...sof, ...new Array(9).fill(0)])
}

function png(width: number, height: number) {
  const buf = new Uint8Array(24)
  const view = new DataView(buf.buffer)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  view.setUint32(16, width)
  view.setUint32(20, height)
  return buf
}

describe('readImageInfo', () => {
  it('reads JPEG and PNG sizes', () => {
    expect(readImageInfo(jpeg(1024, 768))).toEqual({ type: 'image/jpeg', width: 1024, height: 768 })
    expect(readImageInfo(png(640, 480))).toEqual({ type: 'image/png', width: 640, height: 480 })
  })

  it('rejects other or truncated data', () => {
    expect(readImageInfo(new TextEncoder().encode('hello world, not an image'))).toBeNull()
    expect(readImageInfo(jpeg(10, 10).slice(0, 8))).toBeNull()
  })
})
