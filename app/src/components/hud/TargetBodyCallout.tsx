import { useEffect, useMemo, useState, type RefObject } from 'react'
import type { GlobeEngine } from '@/lib/globe-engine'
import { getCelestialEntry } from '@/lib/celestial-catalog'
import { celestialTypeEn, celestialValueEn } from '@/lib/celestial-facts'
import type { CelestialBodyId } from '@/lib/planets'
import type { UiLanguage } from '@/lib/ui-language'

interface TargetBodyCalloutProps {
  bodyId: CelestialBodyId
  engineRef: RefObject<GlobeEngine | null>
  theme: 'dark' | 'light'
  language?: UiLanguage
}

interface CalloutAnchor {
  x: number
  y: number
  radius: number
}

type CalloutPlacement = 'northwest' | 'northeast' | 'southwest' | 'southeast'

const SIGNAL_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/[]{}'

function decodeName(name: string, tick: number): string {
  const revealCount = Math.min(name.length, Math.floor((tick / 13) * name.length))
  return [...name].map((character, index) => {
    if (character === ' ' || index < revealCount) return character
    return SIGNAL_GLYPHS[(tick * 11 + index * 7) % SIGNAL_GLYPHS.length]
  }).join('')
}

function getPlacement(anchor: CalloutAnchor): CalloutPlacement {
  const topRoom = anchor.y - anchor.radius > 156
  const leftRoom = anchor.x - anchor.radius > 286
  if (topRoom && leftRoom) return 'northwest'
  if (topRoom) return 'northeast'
  if (leftRoom) return 'southwest'
  return 'southeast'
}

function getCalloutPosition(anchor: CalloutAnchor, placement: CalloutPlacement) {
  const gap = 28
  if (placement === 'northwest') {
    return { x: anchor.x - anchor.radius - gap, y: anchor.y - anchor.radius - gap }
  }
  if (placement === 'northeast') {
    return { x: anchor.x + anchor.radius + gap, y: anchor.y - anchor.radius - gap }
  }
  if (placement === 'southwest') {
    return { x: anchor.x - anchor.radius - gap, y: anchor.y + anchor.radius + gap }
  }
  return { x: anchor.x + anchor.radius + gap, y: anchor.y + anchor.radius + gap }
}

function getGuideEnd(anchor: CalloutAnchor, placement: CalloutPlacement) {
  const direction = placement === 'northwest' || placement === 'southwest' ? -1 : 1
  const vertical = placement === 'northwest' || placement === 'northeast' ? -1 : 1
  return {
    x: anchor.x + direction * anchor.radius * 0.68,
    y: anchor.y + vertical * anchor.radius * 0.68,
  }
}

export default function TargetBodyCallout({ bodyId, engineRef, theme, language = 'tr' }: TargetBodyCalloutProps) {
  const [anchor, setAnchor] = useState<CalloutAnchor | null>(null)
  const [visible, setVisible] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const fact = getCelestialEntry(bodyId).fact
  const displayName = language === 'tr' ? fact.nameTr : fact.name
  const [decodedName, setDecodedName] = useState(() => decodeName(displayName.toUpperCase(), 0))

  useEffect(() => {
    let frameId = 0
    const update = () => {
      const next = engineRef.current?.getBodyScreenAnchor(bodyId) ?? null
      setAnchor((current) => {
        if (
          current && next &&
          Math.abs(current.x - next.x) < 0.5 &&
          Math.abs(current.y - next.y) < 0.5 &&
          Math.abs(current.radius - next.radius) < 0.5
        ) return current
        return next
      })
      frameId = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frameId)
  }, [bodyId, engineRef])

  useEffect(() => {
    let tick = 0
    const intervalId = window.setInterval(() => {
      tick += 1
      setDecodedName(decodeName(displayName.toUpperCase(), tick))
      if (tick >= 13) window.clearInterval(intervalId)
    }, 32)
    return () => window.clearInterval(intervalId)
  }, [displayName])

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), 5000)
    const hideTimer = window.setTimeout(() => setVisible(false), 5700)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
    }
  }, [bodyId])

  const geometry = useMemo(() => {
    if (!anchor) return null
    const placement = getPlacement(anchor)
    const start = getCalloutPosition(anchor, placement)
    const end = getGuideEnd(anchor, placement)
    return { placement, start, end }
  }, [anchor])

  if (!visible || !anchor || !geometry) return null

  const transform = geometry.placement === 'northwest'
    ? 'translate(-100%, -100%)'
    : geometry.placement === 'northeast'
      ? 'translate(0, -100%)'
      : geometry.placement === 'southwest'
        ? 'translate(-100%, 0)'
        : 'translate(0, 0)'

  return (
    <div className={`pointer-events-none fixed inset-0 z-30 select-none target-callout target-callout--${theme}${leaving ? ' target-callout--leaving' : ''}`} aria-live="polite">
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <line
          className="target-callout__guide"
          x1={geometry.start.x}
          y1={geometry.start.y}
          x2={geometry.end.x}
          y2={geometry.end.y}
        />
        <circle className="target-callout__endpoint" cx={geometry.end.x} cy={geometry.end.y} r="3.5" />
      </svg>
      <section
        className="target-callout__card"
        style={{ left: geometry.start.x, top: geometry.start.y, transform }}
      >
        <div className="target-callout__eyebrow">
          {language === 'tr' ? 'HEDEF KİLİDİ' : 'TARGET LOCK'} / {bodyId.toUpperCase()}
        </div>
        <div className="target-callout__name" aria-label={displayName}>{decodedName}</div>
        <div className="target-callout__rule" />
        <div className="target-callout__meta">
          <span>{language === 'tr' ? fact.typeTr : celestialTypeEn(fact.typeTr)}</span>
          <span>{language === 'tr' ? fact.radiusKm : celestialValueEn(fact.radiusKm)}</span>
        </div>
      </section>
    </div>
  )
}
