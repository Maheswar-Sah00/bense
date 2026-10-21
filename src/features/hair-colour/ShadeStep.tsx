import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HAIR_LEVEL_NAMES, HAIR_LEVEL_SWATCHES } from '../../../shared/domain/hairLevel'
import {
  BRAND_CATALOGUE,
  CATALOGUE,
  findShade,
  MARKETS,
  SHADES,
  shadeLimitations,
  TONE_LABELS,
  type Market,
  type Shade,
} from '../../../shared/domain/shadeCatalogue'
import { FlowHeader } from '../../components/FlowHeader'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Chip, ChipRow } from '../../components/ui/Chip'
import { ListRow, SectionHeader } from '../../components/ui/ListRow'
import { EmptyState } from '../../components/ui/States'
import { useFlow } from '../../state/FlowContext'
import { METHOD_LABELS } from './startingColour'

const DYED_LABELS = { yes: 'Dyed before', no: 'Not dyed before', unsure: 'Not sure if dyed before' }

const BRANDS = [...new Set(SHADES.flatMap((s) => (s.brand ? [s.brand.name] : [])))]
const marketsOf = (brand: string) =>
  (Object.keys(MARKETS) as Market[]).filter((m) => SHADES.some((s) => s.brand?.name === brand && s.brand.market === m))

function levelChangeText(change: number) {
  if (change === 0) return 'Same level as your hair'
  const n = Math.abs(change)
  return `${n} level${n === 1 ? '' : 's'} ${change > 0 ? 'lighter' : 'darker'} than your hair`
}

function ShadeOption({ shade, checked, onSelect }: { shade: Shade; checked: boolean; onSelect: () => void }) {
  return (
    <label className="option">
      <input type="radio" name="shade" value={shade.id} checked={checked} onChange={onSelect} />
      <span className="option-swatch" style={{ background: shade.swatchHex }} />
      <span className="option-code">
        {shade.code} {shade.name}
      </span>
      <span className="option-name">
        Level {shade.level} · {TONE_LABELS[shade.tone]}
      </span>
    </label>
  )
}

export default function ShadeStep() {
  const { colour, setShade } = useFlow()
  const navigate = useNavigate()
  const [group, setGroup] = useState<string>('all')
  const selected = findShade(colour.shadeId)
  // Open on the source of the shade already picked, so returning to this step shows it.
  const [source, setSource] = useState<string>(selected?.brand?.name ?? 'examples')
  const [market, setMarket] = useState<Market>(selected?.brand?.market ?? 'IN')
  const [query, setQuery] = useState('')
  const reviewRef = useRef<HTMLElement>(null)
  const starting = colour.starting

  // Bring the review into view when a shade is picked, so the next step is obvious.
  const pickedRef = useRef(false)
  useEffect(() => {
    if (pickedRef.current && selected) reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])

  const pick = (id: string) => {
    pickedRef.current = true
    setShade(id)
  }

  if (!starting) {
    return (
      <div className="flow">
        <FlowHeader backTo="/colour/starting-colour" step={3} total={4} title="Choose the box" />
        <EmptyState
          icon="colour"
          title="Starting colour needed"
          message="Confirm your starting colour first. The result depends on it."
          action={<ButtonLink to="/colour/starting-colour">Set starting colour</ButtonLink>}
        />
      </div>
    )
  }

  const brand = source !== 'examples' ? source : null
  const markets = brand ? marketsOf(brand) : []
  const shownMarket = markets.includes(market) ? market : markets[0]
  const q = query.trim().toLowerCase()
  const pool = SHADES.filter((s) => (brand ? s.brand?.name === brand && s.brand.market === shownMarket : !s.brand))
  const groups = (!brand && group !== 'all' ? CATALOGUE.groups.filter((g) => g.id === group) : CATALOGUE.groups)
    .map((g) => ({
      ...g,
      shades: pool.filter((s) => s.group === g.id && (!q || `${s.code} ${s.name}`.toLowerCase().includes(q))),
    }))
    .filter((g) => g.shades.length)

  return (
    <div className="flow">
      <FlowHeader
        backTo="/colour/starting-colour"
        step={3}
        total={4}
        title="Choose the box"
      />

      <div className="rows summary-rows">
        <ListRow
          avatar={<span className="swatch-fill" style={{ background: HAIR_LEVEL_SWATCHES[starting.confirmedLevel] }} />}
          title={`Your hair: level ${starting.confirmedLevel} · ${HAIR_LEVEL_NAMES[starting.confirmedLevel]}`}
          subtitle={`${DYED_LABELS[starting.previouslyDyed]} · ${METHOD_LABELS[starting.method]}`}
          value="Change"
          to="/colour/starting-colour"
        />
      </div>

      {colour.unavailableShadeId && (
        <p className="capture-notice" role="alert">
          The shade you picked before isn’t in the catalogue any more. Choose another one.
        </p>
      )}

      {BRANDS.length > 0 && (
        <ChipRow label="Shade source">
          <Chip selected={!brand} onClick={() => setSource('examples')}>
            Example shades
          </Chip>
          {BRANDS.map((b) => (
            <Chip key={b} selected={brand === b} onClick={() => setSource(b)}>
              {b}
            </Chip>
          ))}
        </ChipRow>
      )}

      {brand ? (
        <>
          {markets.length > 1 && (
            <ChipRow label="Market">
              {markets.map((m) => (
                <Chip key={m} selected={shownMarket === m} onClick={() => setMarket(m)}>
                  {MARKETS[m]}
                </Chip>
              ))}
            </ChipRow>
          )}
          <p className="fine-print" title={BRAND_CATALOGUE.notice}>
            Real shades on sale, with brand and product names left out.
          </p>
        </>
      ) : (
        <>
          <p className="fine-print" title={CATALOGUE.notice}>
            Example shades, not real products.
          </p>

          <ChipRow label="Filter shades">
            <Chip selected={group === 'all'} onClick={() => setGroup('all')}>
              All
            </Chip>
            {CATALOGUE.groups
              .filter((g) => SHADES.some((s) => !s.brand && s.group === g.id))
              .map((g) => (
                <Chip key={g.id} selected={group === g.id} onClick={() => setGroup(g.id)}>
                  {g.label}
                </Chip>
              ))}
          </ChipRow>
        </>
      )}

      <input
        id="shade-search"
        className="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by shade code or name"
        aria-label="Search shades"
      />

      {groups.map((g) => (
        <fieldset key={g.id} className="option-grid">
          <legend className="field-label">{g.label}</legend>
          {g.shades.map((shade) => (
            <ShadeOption
              key={shade.id}
              shade={shade}
              checked={colour.shadeId === shade.id}
              onSelect={() => pick(shade.id)}
            />
          ))}
        </fieldset>
      ))}
      {groups.length === 0 && <p className="lead">No shades match “{query}”.</p>}

      {selected ? (
        <section ref={reviewRef} className="review" aria-label="Your selection">
          <SectionHeader title="Your selection" />
          <div className="review-card">
            <div className="review-head">
              <span className="review-swatch" style={{ background: selected.swatchHex }} aria-hidden="true" />
              <div>
                <span className="reading-label">Box shade</span>
                <span className="reading-name">
                  {selected.code} {selected.name}
                </span>
                <span className="row-subtitle">
                  Level {selected.level} · {TONE_LABELS[selected.tone]} ·{' '}
                  {levelChangeText(selected.level - starting.confirmedLevel)}
                </span>
              </div>
            </div>
            <h3 className="review-subhead">Good to know</h3>
            <ul className="review-limits">
              {shadeLimitations(selected).map((limit) => (
                <li key={limit.id}>
                  {limit.text}{' '}
                  {limit.sources
                    .filter((s) => s.url)
                    .map((s, i, all) => (
                      <span key={s.id}>
                        {i > 0 && ', '}
                        <a href={s.url!} target="_blank" rel="noreferrer" className="source-link" title={s.title}>
                          {all.length > 1 ? `Source ${i + 1}` : 'Source'}
                        </a>
                      </span>
                    ))}
                </li>
              ))}
            </ul>
            <p className="fine-print">
              {selected.brand ? (
                <>
                  {selected.brand.name} {selected.brand.range} · {MARKETS[selected.brand.market]}. Swatch is modelled.
                </>
              ) : (
                <>Example shade. Swatch is modelled.</>
              )}
            </p>
          </div>
          <Button block onClick={() => navigate('/colour/result')}>
            Use {selected.code} {selected.name}
          </Button>
        </section>
      ) : (
        <Button block disabled>
          Choose a shade
        </Button>
      )}
    </div>
  )
}
