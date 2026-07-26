import { useEffect, useState } from 'react'

const WORDMARK = 'ASTROBENDER'
const PROTOCOL = 'DATA://SOL-03  EXOLINK_Ω7F2A  HANDSHAKE::LOCKED'
const SCRAMBLE_DURATION_MS = 1100
const VISIBLE_DURATION_MS = 3600
const EXIT_DURATION_MS = 440
const TICK_MS = 45
const ALIEN_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/[]{}ΞΩΔ'

function randomGlyph(): string {
  return ALIEN_GLYPHS[Math.floor(Math.random() * ALIEN_GLYPHS.length)]
}

export default function OpeningWordmark() {
  const [reduceMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [displayWordmark, setDisplayWordmark] = useState(() =>
    reduceMotion ? WORDMARK : [...WORDMARK].map(() => randomGlyph()).join(''),
  )
  const [displayProtocol, setDisplayProtocol] = useState(() =>
    reduceMotion ? PROTOCOL : '',
  )
  const [leaving, setLeaving] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (reduceMotion) {
      const completeTimer = window.setTimeout(() => setComplete(true), 1800)
      return () => window.clearTimeout(completeTimer)
    }

    const startedAt = performance.now()
    const scrambleTimer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      const revealedCharacters = Math.min(
        WORDMARK.length,
        Math.floor((elapsed / SCRAMBLE_DURATION_MS) * (WORDMARK.length + 1)),
      )
      const nextWordmark = [...WORDMARK]
        .map((character, index) => (index < revealedCharacters ? character : randomGlyph()))
        .join('')
      const protocolCharacters = Math.min(
        PROTOCOL.length,
        Math.max(0, Math.floor((elapsed - 180) / 24)),
      )

      setDisplayWordmark(nextWordmark)
      setDisplayProtocol(PROTOCOL.slice(0, protocolCharacters))

      if (elapsed >= SCRAMBLE_DURATION_MS) {
        setDisplayWordmark(WORDMARK)
      }
      if (elapsed >= 180 + PROTOCOL.length * 24) {
        setDisplayProtocol(PROTOCOL)
        window.clearInterval(scrambleTimer)
      }
    }, TICK_MS)

    const leaveTimer = window.setTimeout(() => setLeaving(true), VISIBLE_DURATION_MS)
    const completeTimer = window.setTimeout(
      () => setComplete(true),
      VISIBLE_DURATION_MS + EXIT_DURATION_MS,
    )

    return () => {
      window.clearInterval(scrambleTimer)
      window.clearTimeout(leaveTimer)
      window.clearTimeout(completeTimer)
    }
  }, [reduceMotion])

  if (complete) return null

  return (
    <section
      className={`opening-wordmark ${leaving ? 'opening-wordmark--leaving' : ''}`}
      aria-label="ASTROBENDER açılış başlığı"
    >
      <span className="sr-only">ASTROBENDER</span>
      <div className="opening-wordmark__title" aria-hidden="true">
        {displayWordmark}
      </div>
      <div className="opening-wordmark__protocol" aria-hidden="true">
        <span>{displayProtocol}</span>
        <span className="opening-wordmark__cursor">_</span>
      </div>
    </section>
  )
}
