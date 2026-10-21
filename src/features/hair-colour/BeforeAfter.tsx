import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Chip, ChipRow } from '../../components/ui/Chip'

export interface AfterImage {
  id: string
  label: string
  src: string
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

/**
 * Drag across the photo: your hair now on the left of the handle, the dyed look on the right.
 * On first show the handle sweeps once so people see it moves.
 */
export function BeforeAfter({ before, afters, alt }: { before: string; afters: AfterImage[]; alt: string }) {
  const [afterId, setAfterId] = useState(afters[0].id)
  const after = afters.find((a) => a.id === afterId) ?? afters[0]
  const [pos, setPos] = useState(50)
  const [ratio, setRatio] = useState<number>()
  const [sweeping, setSweeping] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // One hint sweep on first show; any touch or key press ends it.
  useEffect(() => {
    if (!sweeping) return
    const stops = [72, 28, 50]
    const timers = stops.map((p, i) => window.setTimeout(() => setPos(p), 700 + i * 650))
    timers.push(window.setTimeout(() => setSweeping(false), 700 + stops.length * 650))
    return () => timers.forEach(clearTimeout)
  }, [sweeping])

  function moveTo(clientX: number) {
    const box = frameRef.current?.getBoundingClientRect()
    if (box) setPos(clamp(((clientX - box.left) / box.width) * 100))
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = true
    setSweeping(false)
    e.currentTarget.setPointerCapture(e.pointerId)
    moveTo(e.clientX)
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 10 : 2
    const next =
      e.key === 'ArrowLeft'
        ? pos - step
        : e.key === 'ArrowRight'
          ? pos + step
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null
    if (next === null) return
    e.preventDefault()
    setSweeping(false)
    setPos(clamp(next))
  }

  return (
    <figure className="ba">
      {afters.length > 1 && (
        <ChipRow label="Compare your hair with">
          {afters.map((a) => (
            <Chip key={a.id} selected={a.id === after.id} onClick={() => setAfterId(a.id)}>
              {a.label}
            </Chip>
          ))}
        </ChipRow>
      )}

      <div
        ref={frameRef}
        className={`ba-frame${sweeping ? ' is-sweeping' : ''}`}
        style={{ aspectRatio: ratio, ['--ba-pos' as string]: `${pos}%` }}
        role="slider"
        tabIndex={0}
        aria-label={`Before and after: drag to compare your hair with ${after.label.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(100 - pos)}% after`}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={onKeyDown}
      >
        <img
          className="ba-img"
          src={before}
          alt={`${alt}: before`}
          draggable={false}
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        />
        <img
          key={after.id}
          className="ba-img ba-after"
          src={after.src}
          alt={`${alt}: ${after.label}`}
          draggable={false}
        />

        <span className="ba-tag ba-tag-before" aria-hidden="true">
          Before
        </span>
        <span className="ba-tag ba-tag-after" aria-hidden="true">
          {after.label}
        </span>

        <span className="ba-handle" aria-hidden="true">
          <span className="ba-knob">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </span>
        </span>
      </div>
      <figcaption className="ba-hint">Drag to compare</figcaption>
    </figure>
  )
}
