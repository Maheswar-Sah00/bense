import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { say, stopSpeaking } from '../voice/voice'

/** The result in a few plain sentences, with a button that reads them out. */
export function PlainWords({ lines }: { lines: string[] }) {
  const [playing, setPlaying] = useState(false)
  const text = lines.join(' ')

  // Stop talking when the result changes or the page closes.
  useEffect(() => () => stopSpeaking(), [text])

  function toggle() {
    if (playing) return stopSpeaking()
    setPlaying(true)
    say(text, () => setPlaying(false))
  }

  return (
    <section className="panel-card plain-words" aria-label="In plain words">
      <div className="plain-words-head">
        <h2>In plain words</h2>
        <Button variant="secondary" size="sm" icon={playing ? 'voice-off' : 'voice'} onClick={toggle}>
          {playing ? 'Stop' : 'Listen'}
        </Button>
      </div>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  )
}
