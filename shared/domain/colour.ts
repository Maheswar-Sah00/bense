// sRGB ⇄ CIE Lab (D65), ported from tests/boxtruth.py so the app and the harness agree.

export type Lab = readonly [L: number, a: number, b: number]

const WHITE = [0.95047, 1.0, 1.08883] as const

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

export function rgbToHex([r, g, b]: readonly number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function hexToLab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92
  })
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / WHITE[0],
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / WHITE[1],
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / WHITE[2],
  ].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116))
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])]
}

export function labToHex([L, a, b]: Lab): string {
  const fy = (L + 16) / 116
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
  const [x, y, z] = [inv(fy + a / 500) * WHITE[0], inv(fy) * WHITE[1], inv(fy - b / 200) * WHITE[2]]
  const linear = [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ]
  return rgbToHex(
    linear.map((c) => (c > 0.0031308 ? 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055 : 12.92 * c) * 255),
  )
}
