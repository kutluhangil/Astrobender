import { BRIGHT_STARS } from './generated/bright-stars.ts'

export const BRIGHT_STAR_SOURCE_URL = BRIGHT_STARS.sourceUrl
export const BRIGHT_STAR_TABLE = BRIGHT_STARS.vizierTable
export const BRIGHT_STAR_MAGNITUDE_LIMIT = BRIGHT_STARS.magnitudeLimit
export const BRIGHT_STAR_COUNT = BRIGHT_STARS.count

/**
 * Radius of the celestial sphere the sky is painted on, in scene units. The
 * shell is centred on the camera, so it has to clear the furthest the camera
 * can pull back (8,000 units) plus the widest drawn orbit — Sedna's aphelion,
 * at about 1,700 units — or a body on the far side of the Sun would end up
 * behind the stars. It stays inside the camera's 25,000-unit far plane.
 */
export const CELESTIAL_SPHERE_RADIUS = 12000

export interface StarPosition {
  x: number
  y: number
  z: number
}

/**
 * Equatorial J2000 right ascension and declination onto the celestial sphere.
 * The scene's own frame is equatorial — Earth's rotation is driven by sidereal
 * time and the planet positions carry the obliquity rotation — so no extra
 * frame change belongs here.
 */
export function equatorialToScene(
  rightAscensionDeg: number,
  declinationDeg: number,
  radius = CELESTIAL_SPHERE_RADIUS,
): StarPosition {
  if (!Number.isFinite(rightAscensionDeg) || !Number.isFinite(declinationDeg)) {
    throw new Error(`Invalid equatorial coordinate: ${rightAscensionDeg}, ${declinationDeg}`)
  }
  const ra = (rightAscensionDeg * Math.PI) / 180
  const dec = (declinationDeg * Math.PI) / 180
  return {
    x: radius * Math.cos(dec) * Math.cos(ra),
    y: radius * Math.cos(dec) * Math.sin(ra),
    z: radius * Math.sin(dec),
  }
}

export function starCount(): number {
  return BRIGHT_STARS.count
}

export function starPosition(index: number, radius = CELESTIAL_SPHERE_RADIUS): StarPosition {
  if (!Number.isInteger(index) || index < 0 || index >= BRIGHT_STARS.count) {
    throw new Error(`Star index out of range: ${index}`)
  }
  return equatorialToScene(
    BRIGHT_STARS.rightAscension[index],
    BRIGHT_STARS.declination[index],
    radius,
  )
}

export function starMagnitude(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= BRIGHT_STARS.count) {
    throw new Error(`Star index out of range: ${index}`)
  }
  return BRIGHT_STARS.magnitude[index]
}

/**
 * Resolves a Bayer designation such as "Alp ORI" to its catalogue index. A
 * missing designation raises rather than silently dropping a constellation
 * line, because a dropped line is invisible and a wrong figure is not.
 */
export function starIndexByDesignation(designation: string): number {
  const index = BRIGHT_STARS.designations[designation]
  if (index === undefined) {
    throw new Error(`No bright star catalogued for designation: ${designation}`)
  }
  return index
}

export function hasDesignation(designation: string): boolean {
  return BRIGHT_STARS.designations[designation] !== undefined
}

/**
 * Approximate sRGB colour for a Johnson B-V index, following the usual
 * blackbody mapping: negative indices are hot and blue, positive ones cool and
 * red. Values outside the catalogue's range are clamped rather than
 * extrapolated into colours no star has.
 */
export function colourFromBv(bv: number): [number, number, number] {
  const clamped = Math.max(-0.4, Math.min(2.0, Number.isFinite(bv) ? bv : 0))
  const temperature = 4600 * (1 / (0.92 * clamped + 1.7) + 1 / (0.92 * clamped + 0.62))
  const t = temperature / 100

  const channel = (value: number) => Math.max(0, Math.min(1, value / 255))
  let red: number
  let green: number
  let blue: number

  if (t <= 66) {
    red = 255
    green = 99.4708025861 * Math.log(t) - 161.1195681661
  } else {
    red = 329.698727446 * Math.pow(t - 60, -0.1332047592)
    green = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  }
  if (t >= 66) blue = 255
  else if (t <= 19) blue = 0
  else blue = 138.5177312231 * Math.log(t - 10) - 305.0447927307

  return [channel(red), channel(green), channel(blue)]
}

/** Drawn point size, in device pixels, at the two ends of the catalogue. */
export const STAR_POINT_SIZE_BRIGHTEST = 4.2
export const STAR_POINT_SIZE_FAINTEST = 0.9

/** Brightest magnitude in the catalogue — Sirius, at -1.46. */
const BRIGHTEST_MAGNITUDE = Math.min(...BRIGHT_STARS.magnitude)

/**
 * Drawn size for one star's magnitude. Flux across the catalogue spans a factor
 * of about 1,500 between Sirius and the 6.5 limit, which no point size can
 * show, so the drawn radius is linear in magnitude instead of in flux. That is
 * a power law — radius follows roughly the sixth root of flux — and it keeps
 * the naked-eye range legible rather than saturating every star brighter than
 * fourth magnitude at the same dot.
 */
export function starPointSize(magnitude: number): number {
  if (!Number.isFinite(magnitude)) {
    throw new Error(`Invalid star magnitude: ${magnitude}`)
  }
  const span = BRIGHT_STARS.magnitudeLimit - BRIGHTEST_MAGNITUDE
  const faintness = (magnitude - BRIGHTEST_MAGNITUDE) / span
  const size =
    STAR_POINT_SIZE_BRIGHTEST -
    faintness * (STAR_POINT_SIZE_BRIGHTEST - STAR_POINT_SIZE_FAINTEST)
  return Math.max(STAR_POINT_SIZE_FAINTEST, Math.min(STAR_POINT_SIZE_BRIGHTEST, size))
}

export interface StarFieldBuffers {
  positions: Float32Array
  colours: Float32Array
  sizes: Float32Array
}

/**
 * Flat buffers for the whole catalogue: a position on the celestial sphere, an
 * sRGB colour from the B-V index, and a point size from the visual magnitude.
 */
export function buildStarFieldBuffers(radius = CELESTIAL_SPHERE_RADIUS): StarFieldBuffers {
  const count = BRIGHT_STARS.count
  const positions = new Float32Array(count * 3)
  const colours = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let index = 0; index < count; index++) {
    const position = starPosition(index, radius)
    positions.set([position.x, position.y, position.z], index * 3)
    colours.set(colourFromBv(BRIGHT_STARS.colourIndex[index]), index * 3)
    sizes[index] = starPointSize(BRIGHT_STARS.magnitude[index])
  }

  return { positions, colours, sizes }
}
