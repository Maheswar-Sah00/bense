// Hair level on the 1 (black) to 10 (lightest blonde) scale used on dye boxes.

export type HairLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const HAIR_LEVEL_NAMES: Record<HairLevel, string> = {
  1: 'Black',
  2: 'Darkest brown',
  3: 'Dark brown',
  4: 'Medium brown',
  5: 'Light brown',
  6: 'Dark blonde',
  7: 'Medium blonde',
  8: 'Light blonde',
  9: 'Very light blonde',
  10: 'Lightest blonde',
}

export const HAIR_LEVELS: HairLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** Approximate natural colour of each level, for swatches only. Not a measurement. */
export const HAIR_LEVEL_SWATCHES: Record<HairLevel, string> = {
  1: '#1b1512',
  2: '#2a1f1a',
  3: '#3b2a20',
  4: '#4e3626',
  5: '#66452e',
  6: '#80583a',
  7: '#9c7049',
  8: '#b88d5f',
  9: '#d1ac7c',
  10: '#e3c89c',
}

export function isHairLevel(value: unknown): value is HairLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10
}

export function toHairLevel(value: number): HairLevel {
  return Math.min(10, Math.max(1, Math.round(value))) as HairLevel
}
