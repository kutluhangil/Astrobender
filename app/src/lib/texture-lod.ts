/**
 * Distance-based texture level of detail.
 *
 * Every modelled body ships a full-resolution surface texture, and the scene now
 * carries enough of them that keeping each one resident for the rest of the
 * session is not affordable: one 8K colour map costs about 179 MiB of GPU memory
 * once decoded and mipmapped, against roughly 45 MiB for a 4K map. Loading on
 * focus and never releasing means a visitor who tours ten bodies pays for all
 * ten at once.
 *
 * The rule here is deliberately simple: a body keeps its detail texture while it
 * is the focused body or while the camera is close to it, and falls back to its
 * procedural preview once the camera has moved well away. The two thresholds are
 * far apart so drifting across one boundary cannot start a load/release cycle.
 *
 * Loading also requires the body to be on screen, because a planet behind the
 * camera is worth no pixels at all. Releasing deliberately does not consider
 * visibility: if it did, turning the camera away and back would reload the same
 * texture over and over.
 */

/** Load the detail texture inside this many body radii of the camera. */
export const TEXTURE_LOAD_RADII = 40

/** Release it again beyond this many body radii. */
export const TEXTURE_RELEASE_RADII = 90

export type TextureLodAction = 'load' | 'release' | 'keep'

export interface TextureLodInput {
  /** Camera-to-body distance in scene units. */
  distance: number
  /** Body radius in scene units. */
  radius: number
  /** The body the camera is currently locked onto keeps its texture regardless. */
  focused: boolean
  /** A detail texture is already applied. */
  resident: boolean
  /** A request for the detail texture is in flight. */
  loading: boolean
  /** The body is inside the camera frustum. Gates loading only, never releasing. */
  visible: boolean
}

/**
 * What to do with one body's detail texture right now. Raises on impossible
 * geometry rather than guessing, because a NaN distance here would silently
 * unload every surface in the scene.
 */
export function textureLodAction({
  distance,
  radius,
  focused,
  resident,
  loading,
  visible,
}: TextureLodInput): TextureLodAction {
  if (!Number.isFinite(distance) || distance < 0) {
    throw new Error(`Invalid camera distance for texture LOD: ${distance}`)
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`Invalid body radius for texture LOD: ${radius}`)
  }

  if (focused) return resident || loading ? 'keep' : 'load'
  if (resident && distance > radius * TEXTURE_RELEASE_RADII) return 'release'
  if (!resident && !loading && visible && distance < radius * TEXTURE_LOAD_RADII) return 'load'
  return 'keep'
}

/**
 * GPU cost of one decoded texture: four bytes per texel for the base level, plus
 * a third again for the full mip chain. This is what the driver actually
 * allocates, and it is far larger than the compressed file on disk.
 */
export function estimateTextureBytes(width: number, height: number): number {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid texture dimensions: ${width}x${height}`)
  }
  return Math.round(width * height * 4 * (4 / 3))
}

export function textureBytesToMib(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error(`Invalid texture byte count: ${bytes}`)
  }
  return bytes / (1024 * 1024)
}
