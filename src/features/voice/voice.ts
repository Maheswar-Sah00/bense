// One voice for the whole app. Speech comes from Murf through our server (the key stays there);
// if the server has no voice set up or can't be reached, the phone's own voice says it instead.
// Only text is sent, never photos.

// A silent clip, played inside a tap so iPhones allow the real clip to play once it arrives.
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

const clips = new Map<string, Promise<string | null>>()
let audio: HTMLAudioElement | null = null
let primed = false
let serverVoice = true
let turn = 0
let busy = false
let onDone: (() => void) | null = null

function clip(text: string): Promise<string | null> {
  if (!serverVoice) return Promise.resolve(null)
  let pending = clips.get(text)
  if (!pending) {
    pending = fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (res.status === 503) serverVoice = false // not set up: stop asking for this visit
        if (!res.ok) throw new Error(`voice ${res.status}`)
        return URL.createObjectURL(await res.blob())
      })
      .catch(() => {
        clips.delete(text)
        return null
      })
    clips.set(text, pending)
  }
  return pending
}

/** Fetches clips ahead of time, so instructions play the moment they're needed. */
export function preloadSpeech(texts: Iterable<string>) {
  for (const text of texts) void clip(text)
}

function finish(mine: number) {
  if (mine !== turn) return
  busy = false
  const done = onDone
  onDone = null
  done?.()
}

function femaleVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? []
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return (
    english.find((v) => /female|woman|samantha|zira|susan|hazel|heera|veena|karen|moira|tessa|fiona|victoria|aria|jenny/i.test(v.name)) ??
    english.find((v) => /google us english/i.test(v.name))
  )
}

function deviceSay(text: string, mine: number) {
  const synth = window.speechSynthesis
  if (!synth) return finish(mine)
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.05
  const voice = femaleVoice()
  if (voice) utterance.voice = voice
  utterance.onend = utterance.onerror = () => finish(mine)
  synth.speak(utterance)
}

function silence() {
  audio?.pause()
  window.speechSynthesis?.cancel()
}

/** Says the text, replacing anything still being said. onEnd runs when it finishes or is cut off. */
export function say(text: string, onEnd?: () => void) {
  const previous = onDone
  onDone = null
  previous?.()
  const mine = ++turn
  silence()
  busy = true
  onDone = onEnd ?? null

  audio ??= new Audio()
  if (!primed) {
    primed = true
    audio.src = SILENCE
    void audio.play().catch(() => {})
  }

  void clip(text).then(async (url) => {
    if (mine !== turn) return
    if (url && audio) {
      audio.src = url
      audio.onended = audio.onerror = () => finish(mine)
      try {
        await audio.play()
        return
      } catch {
        if (mine !== turn) return
      }
    }
    deviceSay(text, mine)
  })
}

export function stopSpeaking() {
  const done = onDone
  onDone = null
  turn++
  busy = false
  silence()
  done?.()
}

/** True from the moment something is asked to be said until it has been said. */
export const isSpeaking = () => busy
