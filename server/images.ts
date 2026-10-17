// Minimal header parsing to validate uploads without decoding them.

export type ImageType = 'image/jpeg' | 'image/png'

export interface ImageInfo {
  type: ImageType
  width: number
  height: number
}

/** Read type and pixel size from JPEG (SOFn) or PNG (IHDR) headers. Null if neither. */
export function readImageInfo(buf: Uint8Array): ImageInfo | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (buf.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    return { type: 'image/png', width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (buf.length < 4 || view.getUint16(0) !== 0xffd8) return null
  let offset = 2
  while (offset + 9 <= buf.length) {
    if (buf[offset] !== 0xff) return null
    const marker = buf[offset + 1]
    if (marker === 0xff) {
      offset++ // fill byte
      continue
    }
    const length = view.getUint16(offset + 2)
    // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { type: 'image/jpeg', height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
    }
    if (marker === 0xda) return null
    offset += 2 + length
  }
  return null
}
