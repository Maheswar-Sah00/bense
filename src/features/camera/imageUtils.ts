// Image pipeline shared by camera capture and upload. Photos are normalised to an upright
// JPEG of at most 1024 px on the long edge (the YouCam hair APIs reject large images).

export const MAX_UPLOAD_SIDE = 1024
export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MIN_SHORT_SIDE = 480
const JPEG_QUALITY = 0.95

const ACCEPTED: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/heic': ['heic'],
  'image/heif': ['heif'],
}

export type ImageIssue = 'type' | 'empty' | 'too-large' | 'too-small' | 'corrupt' | 'heic' | 'camera-frame'

export const IMAGE_ISSUE_MESSAGES: Record<ImageIssue, string> = {
  type: 'That file isn’t a supported photo. Use a JPEG, PNG, WebP or HEIC image.',
  empty: 'That file is empty. Choose another photo.',
  'too-large': 'That photo is over 20 MB. Choose a smaller one.',
  'too-small': 'That photo is too small to analyse. Use one at least 480 px on its shortest side.',
  corrupt: 'We couldn’t open that photo. It may be damaged. Try another one.',
  heic: 'This browser can’t open HEIC photos. Take the photo with the camera here, or upload a JPEG.',
  'camera-frame': 'The camera didn’t return a picture. Try again.',
}

export class ImageError extends Error {
  readonly issue: ImageIssue

  constructor(issue: ImageIssue) {
    super(IMAGE_ISSUE_MESSAGES[issue])
    this.issue = issue
  }
}

export interface PreparedImage {
  blob: Blob
  width: number
  height: number
}

const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? ''

function acceptedType(file: { name: string; type: string }): string | undefined {
  if (file.type) return file.type in ACCEPTED ? file.type : undefined
  // Some platforms (e.g. HEIC on Windows) report no MIME type; fall back to the extension.
  const ext = extensionOf(file.name)
  return Object.keys(ACCEPTED).find((type) => ACCEPTED[type].includes(ext))
}

/** Cheap checks before decoding anything. */
export function checkFile(file: { name: string; type: string; size: number }): ImageIssue | null {
  if (!acceptedType(file)) return 'type'
  if (file.size === 0) return 'empty'
  if (file.size > MAX_FILE_BYTES) return 'too-large'
  return null
}

export function fitWithin(width: number, height: number, maxSide = MAX_UPLOAD_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** EXIF orientation (1–8) of a JPEG, or 1 when there is none. Reads only the header bytes. */
/**
 * The same JPEG without its APP1 blocks (EXIF and XMP), which can hold GPS location, the camera
 * and the time. The picture data and colour profile are untouched. Returns null if it isn't a
 * well-formed JPEG header.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null
  const keep: Uint8Array[] = [bytes.subarray(0, 2)]
  let offset = 2
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null
    const marker = view.getUint8(offset + 1)
    if (marker === 0xda) {
      keep.push(bytes.subarray(offset)) // image data to the end
      const out = new Uint8Array(keep.reduce((n, part) => n + part.byteLength, 0))
      let at = 0
      for (const part of keep) {
        out.set(part, at)
        at += part.byteLength
      }
      return out
    }
    const end = offset + 2 + view.getUint16(offset + 2)
    if (end > view.byteLength) return null
    if (marker !== 0xe1) keep.push(bytes.subarray(offset, end))
    offset = end
  }
  return null
}

export function readJpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1
  let offset = 2
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return 1
    const marker = view.getUint8(offset + 1)
    const length = view.getUint16(offset + 2)
    if (marker === 0xda) return 1 // start of image data: no EXIF before it
    const isExif = marker === 0xe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966 // "Exif"
    if (isExif) {
      const tiff = offset + 10
      if (tiff + 8 > view.byteLength) return 1
      const little = view.getUint16(tiff) === 0x4949
      const ifd = tiff + view.getUint32(tiff + 4, little)
      if (ifd + 2 > view.byteLength) return 1
      const count = view.getUint16(ifd, little)
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12
        if (entry + 10 > view.byteLength) return 1
        if (view.getUint16(entry, little) === 0x0112) {
          const value = view.getUint16(entry + 8, little)
          return value >= 1 && value <= 8 ? value : 1
        }
      }
      return 1
    }
    offset += 2 + length
  }
  return 1
}

async function encodeJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new ImageError('corrupt')
  ctx.fillStyle = '#ffffff' // transparent PNG areas become white, not black
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  try {
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageError('corrupt'))), 'image/jpeg', JPEG_QUALITY),
    )
  } finally {
    canvas.width = 0 // free the backing store straight away
  }
}

/** Validate, decode (applying EXIF orientation) and normalise an uploaded file. Browser only. */
export async function prepareUpload(file: File): Promise<PreparedImage> {
  const issue = checkFile(file)
  if (issue) throw new ImageError(issue)

  const type = acceptedType(file)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageError(type === 'image/heic' || type === 'image/heif' ? 'heic' : 'corrupt')
  }

  try {
    const { width, height } = bitmap // already upright
    if (Math.min(width, height) < MIN_SHORT_SIDE) throw new ImageError('too-small')

    // Already an upright, small-enough JPEG: keep the picture and colour profile as they are, but
    // drop the EXIF/XMP blocks (location, camera, time) before it can be sent anywhere.
    if (type === 'image/jpeg' && Math.max(width, height) <= MAX_UPLOAD_SIDE) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const clean = readJpegOrientation(bytes.subarray(0, 128 * 1024)) === 1 ? stripJpegMetadata(bytes) : null
      if (clean) return { blob: new Blob([clean as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }), width, height }
    }

    const size = fitWithin(width, height)
    return { blob: await encodeJpeg(bitmap, size.width, size.height), ...size }
  } finally {
    bitmap.close()
  }
}

/** Grab the current camera frame as a JPEG. The saved photo is not mirrored. */
export async function captureVideoFrame(video: HTMLVideoElement): Promise<PreparedImage> {
  if (!video.videoWidth || !video.videoHeight) throw new ImageError('camera-frame')
  const size = fitWithin(video.videoWidth, video.videoHeight)
  return { blob: await encodeJpeg(video, size.width, size.height), ...size }
}

/** Redraw an image to an exact size (centre crop, like object-fit: cover). Browser only. */
export async function resizeToMatch(blob: Blob, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const scale = Math.max(width / bitmap.width, height / bitmap.height)
    const w = bitmap.width * scale
    const h = bitmap.height * scale
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new ImageError('corrupt')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h)
    try {
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageError('corrupt'))), 'image/jpeg', JPEG_QUALITY),
      )
    } finally {
      canvas.width = 0
    }
  } finally {
    bitmap.close()
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
