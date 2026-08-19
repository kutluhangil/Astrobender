import { useEffect, useState, type RefObject } from 'react'
import type { GlobeEngine } from '@/lib/globe-engine'
import type { CelestialBodyId } from '@/lib/planets'

export interface PanelPlacement {
  left: number
  top: number
}

/** Distance between the focused body's silhouette and the panel edge. */
const BODY_GAP_PX = 24
/** Keep the panel clear of the viewport edges and the HUD chrome. */
const VIEWPORT_MARGIN_PX = 16
/** The layer panel owns the left gutter, so the body panel must clear it. */
const LEFT_HUD_RESERVED_PX = 248
/** The offline-storage control owns the bottom-right corner. */
const BOTTOM_HUD_RESERVED_PX = 96

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

/**
 * Track where a body-detail panel should sit so it reads as belonging to the
 * focused body instead of to a fixed screen corner. Returns null while the body
 * has no on-screen anchor, which lets the caller fall back to its static slot.
 */
export function useBodyPanelPlacement(
  bodyId: CelestialBodyId,
  engineRef: RefObject<GlobeEngine | null>,
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): PanelPlacement | null {
  const [placement, setPlacement] = useState<PanelPlacement | null>(null)

  useEffect(() => {
    if (!enabled) return

    let frameId = 0
    const update = () => {
      const anchor = engineRef.current?.getBodyScreenAnchor(bodyId) ?? null
      const panel = panelRef.current
      if (anchor && panel) {
        const width = panel.offsetWidth
        const height = panel.offsetHeight
        const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN_PX
        const maxTop = window.innerHeight - height - BOTTOM_HUD_RESERVED_PX
        // Sit beside the silhouette when there is room on either side. A body
        // that fills the viewport leaves none, so fall back to the right edge
        // rather than clamping left over the layer panel.
        const rightEdge = anchor.x + anchor.radius + BODY_GAP_PX
        const leftEdge = anchor.x - anchor.radius - BODY_GAP_PX - width
        const left =
          rightEdge <= maxLeft
            ? rightEdge
            : leftEdge >= LEFT_HUD_RESERVED_PX
              ? leftEdge
              : maxLeft
        const next = {
          left: clamp(left, VIEWPORT_MARGIN_PX, maxLeft),
          top: clamp(anchor.y - height / 2, VIEWPORT_MARGIN_PX, maxTop),
        }
        setPlacement((current) =>
          current && Math.abs(current.left - next.left) < 1 && Math.abs(current.top - next.top) < 1
            ? current
            : next,
        )
      } else {
        setPlacement(null)
      }
      frameId = requestAnimationFrame(update)
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [bodyId, enabled, engineRef, panelRef])

  return enabled ? placement : null
}
