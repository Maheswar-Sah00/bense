// Browser side of the hair level measurement: decodes the photo and YouCam's #00FF00 render to
// pixels at a working size, then runs the shared measurement. Nothing leaves the device here.
import { measureHairLevel, type CardPoint, type LevelMeasurement, type RgbaImage } from '../../../shared/domain/hairLevelMeasure'

/** Long side used for measuring. The median moves by under 0.5 L* between 256 and 1024 px. */
export const WORK_SIDE = 512

function toPixels(image: ImageBitmap, width: number, height: number): RgbaImage {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('This browser can’t read image pixels.')
  ctx.drawImage(image, 0, 0, width, height)
  return { width, height, data: ctx.getImageData(0, 0, width, height).data, channels: 4 }
}

export async function decodePair(photo: Blob, mask: Blob): Promise<{ photo: RgbaImage; render: RgbaImage }> {
  const [p, r] = await Promise.all([createImageBitmap(photo), createImageBitmap(mask)])
  try {
    // The render must be the same picture: same shape, so pixels line up after scaling.
    if (Math.abs(p.width / p.height - r.width / r.height) > 0.02) {
      throw new Error('YouCam’s hair render doesn’t match the photo’s shape, so it can’t be measured.')
    }
    const scale = Math.min(1, WORK_SIDE / Math.max(p.width, p.height))
    const width = Math.round(p.width * scale)
    const height = Math.round(p.height * scale)
    return { photo: toPixels(p, width, height), render: toPixels(r, width, height) }
  } finally {
    p.close()
    r.close()
  }
}

export async function measureFromBlobs(photo: Blob, mask: Blob, card?: CardPoint): Promise<LevelMeasurement> {
  const pair = await decodePair(photo, mask)
  return measureHairLevel(pair.photo, pair.render, { card })
}
