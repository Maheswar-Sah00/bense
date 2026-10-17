// Builds shared/catalogue/shades.brands.json from shade lists collected from the brands' own websites.
//
//   npx tsx server/scripts/import-brand-shades.ts <list.json> [more lists…]
//
// Each list is an array of { brand, market, range, permanence, code, name, level, toneText, url, notes }.
// Shades without a stated level are left out (the engine needs one) and reported. The tone family is read
// from the brand's tone words, then from the international level.tone digits or US tone letters.
import { readFileSync, writeFileSync } from 'node:fs'
import { isHairLevel, type HairLevel } from '../../shared/domain/hairLevel'
import { modelTargetHex, TONE_FAMILIES, type ToneFamily } from '../../shared/domain/shadeCatalogue'

interface Listed {
  brand: string
  market: 'US' | 'IN'
  range: string
  permanence: string | null
  code: string
  name: string
  level: number | null
  /** How the collector set `level` (e.g. the brand's number guide, or the code's first digit). */
  levelBasis?: string | null
  /** Leading digits of the code, when the brand doesn't explain its numbers. */
  codeLeadingDigits?: string | null
  toneText: string | null
  url: string
  productType?: string | null
  notes?: string | null
}

const CHECKED_AT = '2026-10-16'

// Specific tone words, checked as whole words in the shade name first, then the brand's tone text.
// Order matters: the first match wins, so specific words come before broad ones.
const WORDS: [RegExp, ToneFamily][] = [
  [/\b(burgundy|mahogany|red[- ]violet|violet[- ]red|wine|plum red|bordeaux)\b/, 'mahogany'],
  [/\b(violet|plum|purple|pearl|pearly|iris|lavender|amethyst|iridescent|rose quartz)\b/, 'violet'],
  [/\b(iced|mocha|cool brown|frost|frosted)\b/, 'mocha'],
  [/\b(copper|coppery|strawberry|ginger|cinnamon|apricot|terracotta)\b/, 'copper'],
  [/\b(red|reddish|ruby|auburn|cherry|crimson|scarlet|garnet|raspberry)\b/, 'red'],
  [/\b(gold|golden|honey|caramel|butterscotch|toffee|amber|bronze)\b/, 'golden'],
  [/\b(ash|ashy|cool|smoky|smokey|icy|platinum|silver|titanium|sapphire|blue[- ]black)\b/, 'ash'],
]
const GENERIC = /\b(natural|neutral|black|brown|blonde|chestnut|chocolate|espresso|coffee|beige)\b/
const DIGITS: Record<string, ToneFamily> = { '0': 'neutral', '1': 'ash', '2': 'violet', '3': 'golden', '4': 'copper', '5': 'mahogany', '6': 'red', '8': 'mocha' }
// L'Oréal USA letters: C is Cool there, not copper ("3C Cool Darkest Brown").
const LETTERS: Record<string, ToneFamily> = { N: 'neutral', A: 'ash', G: 'golden', C: 'ash', R: 'red', RB: 'red', M: 'mocha', V: 'violet', RV: 'mahogany' }

function toneOf(s: Pick<Listed, 'code' | 'name' | 'toneText'>): { tone: ToneFamily; by: string } {
  for (const [label, text] of [['name', s.name], ['tone text', s.toneText ?? '']] as const) {
    const words = text.toLowerCase()
    for (const [re, tone] of WORDS) if (re.test(words)) return { tone, by: `the ${label} ("${words.match(re)![0]}")` }
  }
  const dotted = s.code.match(/^\d{1,2}\.(\d)/)
  if (dotted && DIGITS[dotted[1]]) return { tone: DIGITS[dotted[1]], by: `the code's tone digit .${dotted[1]}` }
  const letters = s.code.match(/^\d{1,2}([A-Z]{1,2})$/)
  if (letters && LETTERS[letters[1]]) return { tone: LETTERS[letters[1]], by: `the code's tone letters ${letters[1]}` }
  // Three-digit and Garnier USA codes: level, tone, reflect (53 = level 5, golden tone 3).
  const packed = s.code.match(/^\d(\d)\d?$/)
  if (packed && DIGITS[packed[1]]) return { tone: DIGITS[packed[1]], by: `the code's tone digit ${packed[1]}` }
  const generic = `${s.name} ${s.toneText ?? ''}`.toLowerCase().match(GENERIC)
  return { tone: 'neutral', by: generic ? `the name ("${generic[0]}")` : 'no tone stated (natural assumed)' }
}

const COOL = ['ash', 'violet', 'mocha']
function limitations(level: number, tone: ToneFamily): string[] {
  const ids = ['swatch-approximation']
  if (level <= 3) ids.push('dark-hard-to-undo')
  if (level >= 5) ids.push('lift-limit')
  if (level >= 6) ids.push('dye-cant-lift-dye')
  if ((level >= 6 && (tone === 'neutral' || tone === 'golden')) || (level >= 8 && COOL.includes(tone))) ids.push('warm-exposure')
  if (tone === 'ash') ids.push('ash-green')
  return ids
}

/** Lighteners and bleach kits aren't shades: the engine predicts dye, not bleach. */
const isLightener = (s: Listed) =>
  /lighten|bleach/i.test(`${s.productType ?? ''} ${s.name}`) || /^PL\d$|^B\+/.test(s.code)

function permanence(text: string | null): string {
  if (!text) return 'not stated'
  if (/semi/i.test(text)) return 'semi-permanent'
  if (/demi/i.test(text)) return 'demi-permanent'
  if (/permanent/i.test(text)) return 'permanent'
  return 'not stated'
}

function levelOf(s: Listed): { level: number | null; basis: string } {
  if (s.level !== null && s.levelBasis && /number guide/i.test(s.levelBasis)) {
    return { level: s.level, basis: 'the brand’s own hair colour number guide' }
  }
  const digits = s.level ?? (s.codeLeadingDigits ? Number(s.codeLeadingDigits) : null)
  return { level: digits, basis: 'the shade code’s first number (the usual level.tone numbering; the brand’s site doesn’t explain it)' }
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

{
  const lists = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Listed[])
  const groups: { id: string; label: string }[] = []
  const shades: unknown[] = []
  const skipped: string[] = []
  const ids = new Set<string>()
  for (const s of lists) {
    const where = `${s.brand} ${s.market} ${s.range} ${s.code} ${s.name}`
    if (isLightener(s)) {
      skipped.push(`${where} (lightener, not a dye shade)`)
      continue
    }
    const { level: listedLevel, basis } = levelOf(s)
    if (!isHairLevel(listedLevel)) {
      skipped.push(`${where} (no whole level from the brand${listedLevel !== null ? `: ${listedLevel}` : ''})`)
      continue
    }
    const group = `${slug(s.brand)}-${s.market.toLowerCase()}-${slug(s.range)}`
    if (!groups.some((g) => g.id === group)) groups.push({ id: group, label: s.range })
    let id = `${group}-${slug(s.code)}`
    if (ids.has(id)) id = `${id}-${slug(s.name)}`
    if (ids.has(id)) {
      skipped.push(`${where} (duplicate)`)
      continue
    }
    ids.add(id)
    const level = listedLevel as HairLevel
    const { tone, by } = toneOf(s)
    if (!TONE_FAMILIES.includes(tone)) throw new Error(`bad tone ${tone}`)
    const hex = modelTargetHex(level, tone)
    shades.push({
      id,
      code: s.code,
      name: s.name,
      level,
      tone,
      group,
      targetHex: hex,
      swatchHex: hex,
      limitationIds: limitations(level, tone),
      productLimitations: [],
      provenance: `Real product listed on the brand’s website. Level from ${basis}; tone from ${by}; colour from the Box Truth model.`,
      brand: {
        name: s.brand,
        range: s.range,
        market: s.market,
        permanence: permanence(s.permanence),
        url: s.url,
        checkedAt: CHECKED_AT,
      },
    })
    console.log(`${where.padEnd(70)} level ${level} ${tone.padEnd(9)} (${by})`)
  }
  const out = {
    catalogueVersion: `brands-${CHECKED_AT}`,
    checkedAt: CHECKED_AT,
    notice:
      'Shade codes and names are from the brands’ own websites. Levels and tones are read from the shade codes; swatch colours come from our colour model, not the brand’s colour.',
    groups,
    shades,
  }
  writeFileSync('shared/catalogue/shades.brands.json', JSON.stringify(out, null, 2) + '\n')
  console.log(`\n${shades.length} shades in ${groups.length} ranges; ${skipped.length} left out:`)
  for (const s of skipped) console.log(`  - ${s}`)
}
