import { describe, expect, it } from 'vitest'
import { checkFile, fitWithin, MAX_FILE_BYTES, readJpegOrientation, stripJpegMetadata } from './imageUtils'

/** Minimal JPEG header with an EXIF APP1 segment holding one orientation tag. */
function jpegWithOrientation(orientation: number, littleEndian = false): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(26))
  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d)
  tiff.setUint16(2, 42, littleEndian)
  tiff.setUint32(4, 8, littleEndian) // IFD0 offset
  tiff.setUint16(8, 1, littleEndian) // one entry
  tiff.setUint16(10, 0x0112, littleEndian) // Orientation
  tiff.setUint16(12, 3, littleEndian) // SHORT
  tiff.setUint32(14, 1, littleEndian)
  tiff.setUint16(18, orientation, littleEndian)
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...new Uint8Array(tiff.buffer)]
  const length = exif.length + 2
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...exif, 0xff, 0xda, 0, 2])
}

describe('checkFile', () => {
  const file = (name: string, type: string, size = 1000) => ({ name, type, size })

  it('accepts supported photos', () => {
    expect(checkFile(file('a.jpg', 'image/jpeg'))).toBeNull()
    expect(checkFile(file('a.webp', 'image/webp'))).toBeNull()
  })

  it('falls back to the extension when the type is missing', () => {
    expect(checkFile(file('IMG_1.HEIC', ''))).toBeNull()
    expect(checkFile(file('notes.txt', ''))).toBe('type')
  })

  it('rejects other types, empty files and oversized files', () => {
    expect(checkFile(file('a.gif', 'image/gif'))).toBe('type')
    expect(checkFile(file('a.pdf', 'application/pdf'))).toBe('type')
    expect(checkFile(file('a.jpg', 'image/jpeg', 0))).toBe('empty')
    expect(checkFile(file('a.jpg', 'image/jpeg', MAX_FILE_BYTES + 1))).toBe('too-large')
  })
})

describe('readJpegOrientation', () => {
  it('reads big- and little-endian EXIF orientation', () => {
    expect(readJpegOrientation(jpegWithOrientation(6))).toBe(6)
    expect(readJpegOrientation(jpegWithOrientation(8, true))).toBe(8)
  })

  it('defaults to upright for missing, invalid or truncated data', () => {
    expect(readJpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1)
    expect(readJpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1)
    expect(readJpegOrientation(jpegWithOrientation(6).slice(0, 20))).toBe(1)
    expect(readJpegOrientation(jpegWithOrientation(42))).toBe(1)
  })
})

describe('fitWithin', () => {
  it('scales the long edge down to the max', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1024, height: 768 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 768, height: 1024 })
  })

  it('never upscales small images', () => {
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 })
  })
})

describe('stripJpegMetadata', () => {
  // SOI, APP0 (JFIF, kept), APP1 "Exif" (dropped), SOS + data, EOI.
  const app0 = [0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46]
  const exif = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
  const scan = [0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]
  const jpeg = new Uint8Array([0xff, 0xd8, ...app0, ...exif, ...scan])

  it('removes EXIF/XMP blocks and keeps everything else byte for byte', () => {
    expect([...stripJpegMetadata(jpeg)!]).toEqual([0xff, 0xd8, ...app0, ...scan])
  })

  it('refuses anything that isn’t a well-formed JPEG header', () => {
    expect(stripJpegMetadata(new Uint8Array([1, 2, 3, 4]))).toBeNull()
    expect(stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x40, 0x00]))).toBeNull()
  })
})
