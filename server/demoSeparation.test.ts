// Demo fixtures must never reach real sessions or live results. These modules hold or
// produce live state, so none of them may import the demo data layer.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function files(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(join(root, path)).isDirectory()) return files(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const importsDemo = (path: string) => /from ['"][./]*(?:\.\.\/)*shared\/demo\//.test(readFileSync(join(root, path), 'utf8'))

describe('demo mode separation', () => {
  it.each([
    ['live session state', 'src/state'],
    ['prediction engine and domain rules', 'shared/domain'],
    ['API server (routes, services, YouCam client)', 'server/routes'],
    ['API services', 'server/services'],
    ['YouCam client', 'server/youcam'],
  ])('%s never imports demo data', (_, dir) => {
    const offenders = files(dir).filter(importsDemo).map((f) => relative(root, join(root, f)))
    expect(offenders).toEqual([])
  })

  it('demo screens only show suggestions read-only and never call session setters', () => {
    for (const path of files('src/features/demo')) {
      const source = readFileSync(join(root, path), 'utf8')
      expect(source, path).not.toMatch(/useFlow\(|setShade|confirmStartingColour|setHairProfile|setReveal/)
      if (source.includes('<AlternativeShades')) expect(source, path).toMatch(/<AlternativeShades[^>]*readOnly/)
    }
  })
})
