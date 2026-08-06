// GlobeEngine: imperative three.js scene for the live satellite globe.
//
// Scene frame = ECI (z = north pole). The Earth mesh rotates by GMST, so ECI
// satellite positions from SGP4 line up with the ground directly.
//
// Satellite motion: the worker supplies TWO exact SGP4 samples per interval
// (p0,v0 @ t0, p1,v1 @ t1) and the vertex shader cubic-Hermite-interpolates
// between them — curved orbits stay correct at any time warp. Interpolation
// is clamped to the sample interval, so satellites can never fly off their
// orbits along straight lines when the worker falls behind.

import * as THREE from 'three'
import * as satellite from 'satellite.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { PLANETS, type CelestialBodyId, type PlanetDef } from './planets'
import {
  getCinematicTourCueIndex,
  getCinematicTourCueWindow,
  TOUR_SEQUENCE,
} from './cinematic-tour'
import {
  J2000_MS,
  compressDistanceAu,
  getGeocentricScenePositions,
  getSatelliteScenePosition,
  samplePlanetOrbitScene,
  sampleSatelliteOrbitScene,
  type CartesianPosition,
  type PlanetaryBodyId,
  type SatelliteBodyId,
} from './orbital-mechanics'
import { DEEP_SPACE_PROBES, probeDistanceAuAt, type DeepSpaceProbe } from './probes'
import { CONSTELLATIONS } from './constellations'
import { LANDING_SITES, findLandingSiteNear, type LandingSite } from './landing-sites'
import { createAsteroidSwarm, type AsteroidSwarm } from './asteroids'
import type { AuroraPoint, EarthEvent } from './earth-observatory'

export { TOUR_SEQUENCE } from './cinematic-tour'

export interface BodyScreenAnchor {
  x: number
  y: number
  radius: number
}

/** Runtime state for a rendered planet or moon */
interface PlanetRuntime {
  def: PlanetDef
  mesh: THREE.Mesh
  mat: THREE.ShaderMaterial
  atmo?: THREE.Mesh
  orbitLine?: THREE.Line
  ring?: THREE.Mesh
  minorMoonPoints?: THREE.Points
  moons: PlanetRuntime[]
  ensureLoaded?: () => void
}

export interface EngineCallbacks {
  getSimTime: () => number // ms epoch (simulated)
  onSelect: (index: number | null) => void
  onHover: (index: number | null, clientX: number, clientY: number) => void
  onContextLost: () => void
  onContextRestored: () => void
  /** reported ~once per second */
  onFps?: (fps: number) => void
  /** Fill `past` (t-P/2..t) and `future` (t..t+P/2) with unit ECI points. */
  orbitProvider: (
    index: number,
    simMs: number,
    past: Float32Array,
    future: Float32Array,
  ) => void
  footprintProvider: (
    index: number,
    simMs: number,
  ) => { x: number; y: number; z: number; ang: number } | null
  onPinSelected?: (pin: { lat: number; lon: number; text: string; landingSite?: LandingSite | null } | null) => void
  onSelectBody?: (bodyId: CelestialBodyId) => void
  onTargetChanged?: (bodyId: CelestialBodyId) => void
  onTourEnded?: () => void
}

interface GroupRuntime {
  points: THREE.Points
  mat: THREE.ShaderMaterial
  offset: number
  count: number
  p0: Float32Array
  v0: Float32Array
  p1: Float32Array
  v1: Float32Array
  sizes: Float32Array
}

const SAT_VERT = /* glsl */ `
attribute vec3 aV0;
attribute vec3 aP1;
attribute vec3 aV1;
attribute vec3 aColor;
attribute float aSize;
uniform float uS;    // seconds since t0 (CPU float64 -> float32)
uniform float uDur;  // interval duration in seconds
uniform float uScale;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float s = clamp(uS / uDur, 0.0, 1.0);
  float s2 = s * s;
  float s3 = s2 * s;
  float h00 = 2.0 * s3 - 3.0 * s2 + 1.0;
  float h10 = s3 - 2.0 * s2 + s;
  float h01 = -2.0 * s3 + 3.0 * s2;
  float h11 = s3 - s2;
  vec3 p = h00 * position + h10 * uDur * aV0 + h01 * aP1 + h11 * uDur * aV1;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  // Fade satellite opacity & size smoothly when camera zooms out past Earth orbit (dist > 15.0)
  float distFade = smoothstep(120.0, 15.0, dist);
  vAlpha = clamp(distFade, 0.0, 1.0);
  float ps = aSize * uScale * uPixelRatio * (3.1 / dist) * distFade;
  gl_PointSize = clamp(ps, 0.0, 48.0);
}
`

const SAT_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
uniform float uIntensity;
void main() {
  if (vAlpha < 0.01) discard;
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = smoothstep(0.30, 0.10, d);
  float halo = smoothstep(0.5, 0.12, d) * 0.5;
  vec3 col = vColor * (0.5 + uIntensity * core);
  float alpha = max(halo, core) * vAlpha;
  gl_FragColor = vec4(col, alpha);
}
`

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const EARTH_FRAG = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uSpec;
uniform sampler2D uBump;
uniform vec3 uSunDir;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  // Topography Bump normal perturbation
  float bCenter = texture2D(uBump, vUv).r;
  float bRight  = texture2D(uBump, vUv + vec2(0.0003, 0.0)).r;
  float bUp     = texture2D(uBump, vUv + vec2(0.0, 0.0003)).r;
  vec3 dNorm    = vec3((bCenter - bRight) * 3.5, (bCenter - bUp) * 3.5, 1.0);
  vec3 n        = normalize(vNormalW + dNorm * 0.10);

  float sd = dot(n, uSunDir);
  float dayMix = smoothstep(-0.05, 0.15, sd);
  
  // Day & Night textures
  vec3 dayT = texture2D(uDay, vUv).rgb;
  float luma = dot(dayT, vec3(0.299, 0.587, 0.114));
  dayT = clamp(mix(vec3(luma), dayT, 1.25), 0.0, 1.0);
  vec3 nightT = texture2D(uNight, vUv).rgb * 1.15;
  
  float lit = clamp(sd * 1.1, 0.0, 1.0);
  vec3 col = dayT * lit * 0.78 + dayT * 0.02;
  col += nightT * (1.0 - dayMix) * 0.85;

  // Specular Ocean Sun Reflection
  float specMask = texture2D(uSpec, vUv).r;
  vec3 v = normalize(cameraPosition - vPosW);
  vec3 h = normalize(uSunDir + v);
  float specAmount = pow(max(dot(n, h), 0.0), 32.0) * specMask * dayMix;
  float controlledSpec = min(specAmount, 0.35);
  vec3 sunSpecColor = vec3(1.0, 0.95, 0.85) * controlledSpec * 0.45;
  col += sunSpecColor;

  // Atmosphere Rim
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.5);
  col += vec3(0.20, 0.40, 0.72) * rim * (0.15 + 0.85 * dayMix) * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`

const ATMO_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const ATMO_FRAG = /* glsl */ `
varying vec3 vN;
void main() {
  float intensity = pow(max(0.60 - dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), 4.5);
  gl_FragColor = vec4(0.35, 0.65, 1.15, 1.0) * intensity * 1.1;
}
`

const CLOUD_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uCloudsTex;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec3 n = normalize(vNormalW);
  float sd = dot(n, uSunDir);
  float dayMix = smoothstep(-0.08, 0.12, sd);
  float cloudDensity = texture2D(uCloudsTex, vUv).r;
  
  if (cloudDensity < 0.05) discard;

  vec3 cloudDay = vec3(0.96, 0.98, 1.0) * (0.35 + 0.65 * clamp(sd, 0.0, 1.0));
  vec3 cloudNight = vec3(0.04, 0.06, 0.12);
  vec3 col = mix(cloudNight, cloudDay, dayMix);

  float alpha = smoothstep(0.05, 0.85, cloudDensity) * 0.78;
  gl_FragColor = vec4(col, alpha);
}
`

const MOON_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const MOON_FRAG = /* glsl */ `
uniform sampler2D uMoonTex;
uniform sampler2D uMoonBump;
uniform sampler2D uMoonSpec;
uniform vec3 uSunDir;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  // Crater Bump topography normal perturbation
  float bCenter = texture2D(uMoonBump, vUv).r;
  float bRight  = texture2D(uMoonBump, vUv + vec2(0.0003, 0.0)).r;
  float bUp     = texture2D(uMoonBump, vUv + vec2(0.0, 0.0003)).r;
  vec3 dNorm    = vec3((bCenter - bRight) * 4.2, (bCenter - bUp) * 4.2, 1.0);
  vec3 n        = normalize(vNormalW + dNorm * 0.12);

  float sd = dot(n, uSunDir);
  float dayMix = smoothstep(-0.02, 0.06, sd);
  
  vec3 texCol = texture2D(uMoonTex, vUv).rgb;
  float lit = clamp(sd * 1.15, 0.0, 1.0);
  
  // Base lunar surface color + subtle dark side earthshine
  vec3 col = texCol * lit * 0.95 + texCol * 0.035;

  // Earthshine: Blue-cyan Earth light reflecting onto Moon's night side
  vec3 earthDir = normalize(-vPosW);
  float earthLit = max(dot(n, earthDir), 0.0);
  vec3 earthshineColor = vec3(0.20, 0.48, 0.80) * earthLit * (1.0 - dayMix) * 0.22;
  col += earthshineColor;

  // Lunar regolith & impact melt specular reflection
  float specMask = texture2D(uMoonSpec, vUv).r;
  vec3 v = normalize(cameraPosition - vPosW);
  vec3 h = normalize(uSunDir + v);
  float specAmount = pow(max(dot(n, h), 0.0), 28.0) * specMask * dayMix;
  col += vec3(0.9, 0.92, 1.0) * specAmount * 0.7;

  // Subtle lunar exosphere rim glow
  float rim = pow(1.0 - max(dot(n, v), 0.0), 4.5);
  col += vec3(0.70, 0.78, 0.95) * rim * 0.10;

  gl_FragColor = vec4(col, 1.0);
}
`

const ORBIT_SIDE = 96
const FOOT_POINTS = 96
const EARTH_R_SCENE = 1.0

const PLANET_BASE_COLORS: Record<string, string> = {
  mercury: '#9ea0a5',
  venus: '#e3bb73',
  mars: '#c85a32',
  phobos: '#786b5e',
  deimos: '#80766b',
  jupiter: '#b8946e',
  io: '#c9a946',
  europa: '#c8c5b9',
  ganymede: '#827d74',
  callisto: '#655d53',
  saturn: '#cfb584',
  titan: '#a56627',
  enceladus: '#dce7ee',
  mimas: '#c7c9ca',
  tethys: '#d9dcdf',
  dione: '#b6bec5',
  rhea: '#a9acae',
  iapetus: '#756a60',
  uranus: '#64b4c8',
  miranda: '#a6afb5',
  ariel: '#c1c9cd',
  umbriel: '#71777d',
  titania: '#7d8c94',
  oberon: '#6d7479',
  neptune: '#3e6bb5',
  proteus: '#6d7177',
  nereid: '#8a8f96',
  triton: '#a98d91',
  pluto: '#a49889',
  charon: '#a7a19d',
}

function createPlanetBaseTexture(planetId: string): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 4
  const ctx = c.getContext('2d')!
  ctx.fillStyle = PLANET_BASE_COLORS[planetId] || '#666666'
  ctx.fillRect(0, 0, 4, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function deterministicUnit(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function createMinorMoonPoints(def: PlanetDef, count: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const innerRadius = def.radius * ((def.ring?.outerRadius ?? 2.2) + 0.5)
  const outerRadius = def.radius * (6.2 + Math.log10(count + 1))
  for (let index = 0; index < count; index++) {
    const angle = deterministicUnit(index, 1) * Math.PI * 2
    const distance = innerRadius + (outerRadius - innerRadius) * deterministicUnit(index, 2)
    const inclination = (deterministicUnit(index, 3) - 0.5) * 0.28
    positions[index * 3] = Math.cos(angle) * distance
    positions[index * 3 + 1] = Math.sin(angle) * distance
    positions[index * 3 + 2] = Math.sin(inclination) * distance
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xb9c9d8,
      size: Math.max(0.012, def.radius * 0.018),
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  )
}

function makeRingTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 96
  const ctx = c.getContext('2d')!
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(48, 48, 32, 0, Math.PI * 2)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class GlobeEngine {
  private container: HTMLElement
  private cb: EngineCallbacks
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private earth: THREE.Mesh
  private earthMat: THREE.ShaderMaterial
  private clouds: THREE.Mesh
  private cloudsMat: THREE.ShaderMaterial
  private pinMarker: THREE.Sprite
  private sun: THREE.Mesh
  private sunMat: THREE.ShaderMaterial
  private sunCorona: THREE.Mesh
  private signalCone: THREE.Mesh
  private moon: THREE.Mesh
  private moonMat: THREE.ShaderMaterial
  private moonHighResolutionRequested = false
  private moonOrbitLine: THREE.Line
  private earthLandmarks: THREE.Group
  private earthObservatoryMarkers: THREE.Group
  private auroraOverlay: THREE.Points
  private focusTarget: CelestialBodyId = 'earth'
  private planetRuntimes: PlanetRuntime[] = []
  private probeGroup: THREE.Group | null = null
  private constellationGroup: THREE.Group | null = null
  private asteroidSwarm: AsteroidSwarm | null = null
  private lastAsteroidUpdateReal = 0
  /** Preallocated — mutated via .copy() every frame, never reassigned. Validity tracked by hasLastFocusPos. */
  private lastFocusPos = new THREE.Vector3()
  private hasLastFocusPos = false
  private starsMat: THREE.PointsMaterial | null = null
  public currentTheme: 'dark' | 'light' = 'dark'
  public isCinematicTourActive: boolean = false
  public tourTargetIndex: number = 0
  private tourStartTime: number = 0
  private tourAudioDurationS = 0
  private flyToActive = false
  private flyToStartTime = 0
  private flyToStartCam = new THREE.Vector3()
  private flyToStartTarget = new THREE.Vector3()
  private tmpVec1 = new THREE.Vector3()
  private tmpVec2 = new THREE.Vector3()
  private tmpVec3 = new THREE.Vector3()
  private tmpVec4 = new THREE.Vector3()
  private reusableDate = new Date()
  private groups: GroupRuntime[] = []
  /** hidden replacement set during a dataset swap (old groups keep rendering) */
  private replacement: GroupRuntime[] | null = null
  private desiredVisible: boolean[] = []
  private qualityCap = 1.25
  private appliedW = 0
  private appliedH = 0
  private appliedDpr = 0
  private resizeObserver: ResizeObserver | null = null
  private raf = 0
  private hidden = false
  private contextLost = false
  private t0 = 0 // interval start, s
  private t1 = 1 // interval end, s
  private selected: number | null = null
  private hoverIdx: number | null = null
  private marker: THREE.Sprite
  private orbitPast: THREE.Line
  private orbitFuture: THREE.Line
  private pastGeo: THREE.BufferGeometry
  private futureGeo: THREE.BufferGeometry
  private footLine: THREE.Line
  private footGeo: THREE.BufferGeometry
  private showOrbit = true
  private showFoot = true
  private follow = false
  private lastOrbitReal = 0
  private lastOrbitSim = -1e15
  private lastFootReal = 0
  private disposed = false
  private tmpV = new THREE.Vector3()
  private tmpV2 = new THREE.Vector3()
  /**
   * Cached canvas bounding rect, refreshed in applySize() (resize/DPR changes).
   * The canvas is `absolute inset-0` inside a `relative` root that itself fills
   * html/body/#root (all `overflow: hidden`, no page scroll possible) — so the
   * only thing that can move or resize this rect is a viewport/container size
   * change, which ResizeObserver already routes through applySize(). No scroll
   * listener is needed.
   */
  private canvasRect: DOMRect = new DOMRect()
  private isPointerDown = false
  private downPos = { x: 0, y: 0 }
  private lastHoverCheck = 0
  private frameTimes: number[] = []
  private dprReduced = false
  private lastFrameT = 0
  private fpsCount = 0
  private fpsWindowStart = 0

  constructor(container: HTMLElement, cb: EngineCallbacks) {
    this.container = container
    this.cb = cb

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 1)
    container.appendChild(this.renderer.domElement)

    const initW = Math.max(1, container.clientWidth)
    const initH = Math.max(1, container.clientHeight)
    this.camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 25000.0)
    this.camera.up.set(0, 0, 1)
    // large, dominant Earth; lower edge may bleed off the viewport
    this.camera.position.set(1.0, -2.75, 1.35)
    this.applyViewOffset()

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 1.35
    this.controls.maxDistance = 8000.0
    this.controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.controls.autoRotateSpeed = 0.25

    // --- Earth ---
    const loader = new THREE.TextureLoader()
    const dayTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-day-8k.jpg`)
    const nightTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-night-4k.jpg`)
    const specTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-specular-2k.jpg`)
    const bumpTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-bump-2k.jpg`)

    dayTex.colorSpace = THREE.SRGBColorSpace
    nightTex.colorSpace = THREE.SRGBColorSpace
    dayTex.anisotropy = 16
    nightTex.anisotropy = 16
    // scalar masks (land/ocean, height field) sampled for a finite-difference gradient —
    // anisotropic filtering is wasted work here
    specTex.anisotropy = 1
    bumpTex.anisotropy = 1
    dayTex.minFilter = THREE.LinearMipmapLinearFilter
    dayTex.magFilter = THREE.LinearFilter

    const geo = new THREE.SphereGeometry(1, 128, 128)
    geo.rotateX(Math.PI / 2) // poles -> +z, lon0 -> +x
    this.earthMat = new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: dayTex },
        uNight: { value: nightTex },
        uSpec: { value: specTex },
        uBump: { value: bumpTex },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uTime: { value: 0 },
      },
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
    })
    this.earth = new THREE.Mesh(geo, this.earthMat)
    // 23.44° Real Earth Axial Tilt
    this.earth.rotation.x = 23.44 * (Math.PI / 180)
    this.scene.add(this.earth)

    // --- Major World City Markers ---
    this.earthLandmarks = new THREE.Group()
    const MAJOR_CITIES = [
      { name: 'Istanbul', lat: 41.01, lon: 28.98 },
      { name: 'Tokyo', lat: 35.67, lon: 139.65 },
      { name: 'London', lat: 51.51, lon: -0.13 },
      { name: 'New York', lat: 40.71, lon: -74.01 },
      { name: 'Sydney', lat: -33.87, lon: 151.21 },
      { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17 },
    ]
    const cityMarkTex = makeRingTexture()
    for (const c of MAJOR_CITIES) {
      const phi = (90 - c.lat) * (Math.PI / 180)
      const theta = (c.lon + 180) * (Math.PI / 180)
      const cx = -(1.008 * Math.sin(phi) * Math.cos(theta))
      const cy = 1.008 * Math.cos(phi)
      const cz = 1.008 * Math.sin(phi) * Math.sin(theta)
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cityMarkTex,
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.8,
        }),
      )
      sprite.position.set(cx, cy, cz)
      sprite.scale.setScalar(0.022)
      this.earthLandmarks.add(sprite)
    }
    this.earth.add(this.earthLandmarks)
    this.earthObservatoryMarkers = new THREE.Group()
    this.earthObservatoryMarkers.visible = false
    this.earth.add(this.earthObservatoryMarkers)
    this.auroraOverlay = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.018,
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.auroraOverlay.visible = false
    this.earth.add(this.auroraOverlay)

    // --- Cloud Layer — 96×96 sphere (vs old 256×256 = 86% fewer vertices, no visible diff) ---
    const cloudsTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-clouds-4k.jpg`)
    cloudsTex.colorSpace = THREE.SRGBColorSpace
    cloudsTex.anisotropy = 8  // 8 is imperceptible vs 16 on clouds; saves GPU bandwidth
    const cloudGeo = new THREE.SphereGeometry(1.015, 96, 96)
    cloudGeo.rotateX(Math.PI / 2)
    this.cloudsMat = new THREE.ShaderMaterial({
      uniforms: {
        uCloudsTex: { value: cloudsTex },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
    })
    this.clouds = new THREE.Mesh(cloudGeo, this.cloudsMat)
    this.clouds.rotation.x = 23.44 * (Math.PI / 180)
    this.scene.add(this.clouds)

    // --- narrow atmospheric rim (may bloom; Earth must not) ---
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.09, 128, 128),
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.scene.add(atmo)

    // --- Moon (colour upgrades to 8K on focus; bump/specular stay at 2K — see loadMoonHighResolution) ---
    const moonTex = loader.load(`${import.meta.env.BASE_URL}textures/moon-4k.webp`)
    const moonBumpTex = loader.load(`${import.meta.env.BASE_URL}textures/moon-bump-2k.webp`)
    const moonSpecTex = loader.load(`${import.meta.env.BASE_URL}textures/moon-specular-2k.webp`)

    moonTex.colorSpace = THREE.SRGBColorSpace
    moonTex.anisotropy = 16
    // scalar masks (height field, specular mask) — anisotropic filtering is wasted work here
    moonBumpTex.anisotropy = 1
    moonSpecTex.anisotropy = 1
    moonTex.minFilter = THREE.LinearMipmapLinearFilter
    moonTex.magFilter = THREE.LinearFilter

    const moonGeo = new THREE.SphereGeometry(0.2727, 64, 64)
    moonGeo.rotateX(Math.PI / 2)
    this.moonMat = new THREE.ShaderMaterial({
      uniforms: {
        uMoonTex: { value: moonTex },
        uMoonBump: { value: moonBumpTex },
        uMoonSpec: { value: moonSpecTex },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uTime: { value: 0 },
      },
      vertexShader: MOON_VERT,
      fragmentShader: MOON_FRAG,
    })
    this.moon = new THREE.Mesh(moonGeo, this.moonMat)
    this.scene.add(this.moon)



    // Moon Orbit Path
    const moonSegs = 128
    const orbitPts = sampleSatelliteOrbitScene('moon', moonSegs).map(
      ({ x, y, z }) => new THREE.Vector3(x, y, z),
    )
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts)
    this.moonOrbitLine = new THREE.Line(
      moonOrbitGeo,
      new THREE.LineBasicMaterial({
        color: 0x88bbff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      }),
    )
    // Matches createPlanet()'s orbitLine and Home.tsx's planetaryOrbitsVisible
    // default (both false) — setPlanetaryOrbitsVisible() already governs this
    // line alongside every planet orbit line, so it should start in sync with them.
    this.moonOrbitLine.visible = false
    this.scene.add(this.moonOrbitLine)

    // --- 8K 3D Sun Globe & Volumetric Corona Atmosphere ---
    const sunMapTex = loader.load(`${import.meta.env.BASE_URL}textures/sun-map.jpg`)
    sunMapTex.colorSpace = THREE.SRGBColorSpace
    sunMapTex.anisotropy = 16
    const sunGeo = new THREE.SphereGeometry(2.5, 64, 64)
    sunGeo.rotateX(Math.PI / 2)

    this.sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunMap: { value: sunMapTex },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uSunMap;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;

        void main() {
          vec2 uv = vUv;
          uv.x += sin(uv.y * 35.0 + uTime * 0.6) * 0.0018;
          uv.y += cos(uv.x * 35.0 + uTime * 0.6) * 0.0018;

          vec3 texCol = texture2D(uSunMap, uv).rgb;
          vec3 v = normalize(cameraPosition - vPosW);
          float rim = 1.0 - max(dot(vNormalW, v), 0.0);
          float coronaGlow = pow(rim, 2.0);

          vec3 baseSun = texCol * 1.45 + vec3(0.25, 0.10, 0.0);
          vec3 flareColor = vec3(1.0, 0.58, 0.18) * coronaGlow * 1.9;

          gl_FragColor = vec4(baseSun + flareColor, 1.0);
        }
      `,
    })
    this.sun = new THREE.Mesh(sunGeo, this.sunMat)
    this.scene.add(this.sun)

    // Volumetric Solar Corona Atmosphere Halo
    const coronaGeo = new THREE.SphereGeometry(2.85, 64, 64)
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vec3 v = normalize(cameraPosition - vPosW);
          float intensity = pow(max(0.65 - dot(vNormalW, v), 0.0), 2.8);
          float pulse = sin(uTime * 2.5) * 0.12 + 0.88;
          gl_FragColor = vec4(1.0, 0.62, 0.20, 1.0) * intensity * 2.5 * pulse;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
    this.sunCorona = new THREE.Mesh(coronaGeo, coronaMat)
    this.sun.add(this.sunCorona)

    // ═══════════════════════════════════════════════════════════════════════
    // SOLAR SYSTEM PLANETS & MOONS — dynamic from PLANETS config
    // ═══════════════════════════════════════════════════════════════════════
    this.planetRuntimes = PLANETS.map((def) => this.createPlanet(def, loader))
    // Detailed planet and moon textures are loaded on focus. Loading every 2K–8K
    // source in the background exhausts the WebGL texture budget on long sessions;
    // distant bodies keep their lightweight procedural preview until selected.

    this.scene.add(this.makeStars())

    // ═══════════════════════════════════════════════════════════════════════
    // COSMIC ENVIRONMENTS — Deep Space Probes, Constellations
    // ═══════════════════════════════════════════════════════════════════════
    this.probeGroup = this.makeProbes()
    this.constellationGroup = this.makeConstellations()

    // --- 3D Asteroid & Kuiper Belts (Instanced Swarm) ---
    this.asteroidSwarm = createAsteroidSwarm(this.sun.position)
    this.scene.add(this.asteroidSwarm.mainBelt)
    this.scene.add(this.asteroidSwarm.kuiperBelt)
    this.asteroidSwarm.mainBelt.visible = false
    this.asteroidSwarm.kuiperBelt.visible = false

    if (this.probeGroup) {
      this.probeGroup.visible = false
      this.scene.add(this.probeGroup)
    }
    if (this.constellationGroup) {
      this.constellationGroup.visible = false
      this.scene.add(this.constellationGroup)
    }

    // --- selection marker ---
    this.marker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeRingTexture(),
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.marker.scale.setScalar(0.05)
    this.marker.visible = false
    this.scene.add(this.marker)

    // --- Lat-Lon Click Pin Marker ---
    this.pinMarker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeRingTexture(),
        color: 0x38bdf8,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.pinMarker.scale.setScalar(0.07)
    this.pinMarker.visible = false
    this.scene.add(this.pinMarker)

    // --- orbit path: past (red) + future (blue) ---
    this.pastGeo = new THREE.BufferGeometry()
    this.pastGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(ORBIT_SIDE * 3), 3),
    )
    this.pastGeo.setDrawRange(0, 0)
    this.orbitPast = new THREE.Line(
      this.pastGeo,
      new THREE.LineBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.orbitPast.frustumCulled = false
    this.scene.add(this.orbitPast)

    this.futureGeo = new THREE.BufferGeometry()
    this.futureGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(ORBIT_SIDE * 3), 3),
    )
    this.futureGeo.setDrawRange(0, 0)
    this.orbitFuture = new THREE.Line(
      this.futureGeo,
      new THREE.LineBasicMaterial({
        color: 0x63b3ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.orbitFuture.frustumCulled = false
    this.scene.add(this.orbitFuture)

    // --- ground footprint circle ---
    this.footGeo = new THREE.BufferGeometry()
    this.footGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((FOOT_POINTS + 1) * 3), 3),
    )
    this.footGeo.setDrawRange(0, 0)
    this.footLine = new THREE.Line(
      this.footGeo,
      new THREE.LineBasicMaterial({
        color: 0x9fd8ff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true, // occluded on the far side
      }),
    )
    this.footLine.frustumCulled = false
    this.scene.add(this.footLine)

    // --- 3D Satellite Signal Cone ---
    const coneGeo = new THREE.CylinderGeometry(0.005, 0.25, 1, 32, 1, true)
    coneGeo.translate(0, 0.5, 0)
    coneGeo.rotateX(Math.PI / 2)
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.signalCone = new THREE.Mesh(coneGeo, coneMat)
    this.signalCone.visible = false
    this.scene.add(this.signalCone)

    // --- Bloom at half resolution: saves 1 full-res render pass on every frame ---
    // Bloom is blurry by nature so half-res is visually indistinguishable
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(Math.ceil(initW / 2), Math.ceil(initH / 2)), 0.45, 0.25, 0.98)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.applySize()

    // --- events ---
    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('webglcontextlost', this.onContextLost, false)
    el.addEventListener('webglcontextrestored', this.onContextRestored, false)
    // the container may resize without a window resize event
    this.resizeObserver = new ResizeObserver(() => this.applySize())
    this.resizeObserver.observe(container)
    document.addEventListener('visibilitychange', this.onVisibility)

    this.loop()
  }

  // ─── Planet Factory ─────────────────────────────────────────────────────
  private createPlanet(def: PlanetDef, loader: THREE.TextureLoader): PlanetRuntime {
    const tex = createPlanetBaseTexture(def.id)
    let isLoaded = false
    const ensureLoaded = () => {
      if (isLoaded) return
      isLoaded = true
      if (!def.texture) return
      const textureUrl = `${import.meta.env.BASE_URL}textures/${def.texture}`
      loader.load(
        textureUrl,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace
          loadedTex.anisotropy = 8
          loadedTex.minFilter = THREE.LinearMipmapLinearFilter
          loadedTex.magFilter = THREE.LinearFilter
          mat.uniforms.uTex.value = loadedTex
          mat.needsUpdate = true
        },
        undefined,
        () => {
          throw new Error(`Failed to load texture for ${def.id}: ${textureUrl}`)
        },
      )
    }

    const geo = new THREE.SphereGeometry(def.radius, def.segments, def.segments)
    geo.rotateX(Math.PI / 2) // poles -> +z
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: tex },
        uTint: {
          value: new THREE.Vector3(...(def.surfaceTint ?? [1, 1, 1])),
        },
        uAmbient: { value: def.parent ? 0.30 : 0.06 },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        uniform vec3 uTint;
        uniform float uAmbient;
        uniform vec3 uSunDir;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vec3 sampled = texture2D(uTex, vUv).rgb;
          vec3 texCol = clamp(sampled * uTint, 0.0, 1.0);
          float lit = dot(vNormalW, uSunDir);
          float day = smoothstep(-0.15, 0.35, lit);
          vec3 col = texCol * (uAmbient + (1.0 - uAmbient) * day);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = def.axialTilt * (Math.PI / 180)
    if (def.shapeScale) mesh.scale.set(...def.shapeScale)
    this.scene.add(mesh)

    // Atmosphere rim glow — smooth, soft atmospheric haze
    let atmo: THREE.Mesh | undefined
    if (def.atmosphereColor) {
      const [ar, ag, ab] = def.atmosphereColor
      const atmoGeo = new THREE.SphereGeometry(def.radius * 1.025, 64, 64)
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormalW;
          varying vec3 vPosW;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vPosW = wp.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uSunDir;
          varying vec3 vNormalW;
          varying vec3 vPosW;
          void main() {
            vec3 v = normalize(cameraPosition - vPosW);
            float rim = pow(1.0 - max(dot(vNormalW, v), 0.0), 3.5);
            float sunLit = max(dot(vNormalW, uSunDir) * 0.5 + 0.5, 0.2);
            float alpha = rim * 0.42 * sunLit;
            gl_FragColor = vec4(${ar.toFixed(2)}, ${ag.toFixed(2)}, ${ab.toFixed(2)}, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      })
      atmo = new THREE.Mesh(atmoGeo, atmoMat)
      mesh.add(atmo)
    }

    const orbSegs = 128
    const orbitPts = (
      def.parent
        ? sampleSatelliteOrbitScene(def.id as SatelliteBodyId, orbSegs)
        : samplePlanetOrbitScene(
            def.id as PlanetaryBodyId,
            this.cb.getSimTime(),
            orbSegs,
          )
    ).map(({ x, y, z }) => new THREE.Vector3(x, y, z))
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts)
    const orbitLine = new THREE.Line(
      orbitGeo,
      new THREE.LineBasicMaterial({
        color: 0x556688,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
      }),
    )
    orbitLine.visible = false
    this.scene.add(orbitLine)

    // Planetary ring systems. Saturn uses the detailed texture; the fainter
    // giant-planet rings use a deliberately subtle procedural material.
    let ring: THREE.Mesh | undefined
    if (def.ring) {
      const innerR = def.radius * def.ring.innerRadius
      const outerR = def.radius * def.ring.outerRadius
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 128)
      const ringMat = def.ring.texture
        ? new THREE.ShaderMaterial({
            uniforms: {
              uRingTex: {
                value: loader.load(
                  `${import.meta.env.BASE_URL}textures/${def.ring.texture}`,
                ),
              },
              uInnerR: { value: innerR },
              uOuterR: { value: outerR },
              uOpacity: { value: def.ring.opacity },
            },
            vertexShader: /* glsl */ `
          varying vec3 vLocalPos;
          void main() {
            vLocalPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
            fragmentShader: /* glsl */ `
          varying vec3 vLocalPos;
          uniform sampler2D uRingTex;
          uniform float uInnerR;
          uniform float uOuterR;
          uniform float uOpacity;

          void main() {
            float r = length(vLocalPos.xy);
            float t = (r - uInnerR) / (uOuterR - uInnerR);
            t = clamp(t, 0.0, 1.0);

            vec4 ringCol = texture2D(uRingTex, vec2(t, 0.5));
            float edgeFade = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t));

            gl_FragColor = vec4(ringCol.rgb, ringCol.a * edgeFade * uOpacity);
          }
        `,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
          })
        : new THREE.MeshBasicMaterial({
            color: def.ring.color,
            opacity: def.ring.opacity,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
      ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      mesh.add(ring)
    }

    // Add historic landing sites to planet/moon surface (hidden by default to keep surfaces clean)
    const sites = LANDING_SITES.filter((s) => s.bodyId === def.id)
    if (sites.length > 0) {
      const landmarkGroup = new THREE.Group()
      landmarkGroup.visible = false // Remove orange ring markers from planet surfaces
      const markTex = makeRingTexture()
      for (const s of sites) {
        const phi = (90 - s.lat) * (Math.PI / 180)
        const theta = (s.lon + 180) * (Math.PI / 180)
        const lx = -(def.radius * 1.01 * Math.sin(phi) * Math.cos(theta))
        const ly = def.radius * 1.01 * Math.cos(phi)
        const lz = def.radius * 1.01 * Math.sin(phi) * Math.sin(theta)

        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: markTex,
            color: 0xf59e0b, // Amber gold landmark ring
            transparent: true,
            depthWrite: false,
          }),
        )
        sprite.position.set(lx, ly, lz)
        sprite.scale.setScalar(Math.max(0.04, def.radius * 0.05))
        sprite.userData = { site: s }
        landmarkGroup.add(sprite)
      }
      mesh.add(landmarkGroup)
    }

    // Moons (recursive, orbit around parent planet)
    const moonRTs: PlanetRuntime[] = []
    for (const moonDef of def.moons ?? []) {
      const moonRT = this.createPlanet(moonDef, loader)
      // Keep moonRT.mesh in scene so moon renders in 3D world space
      moonRTs.push(moonRT)
    }

    const remainingMoonCount = Math.max(
      0,
      (def.knownMoonCount ?? moonRTs.length) - moonRTs.length,
    )
    const minorMoonPoints =
      remainingMoonCount > 0 ? createMinorMoonPoints(def, remainingMoonCount) : undefined
    if (minorMoonPoints) mesh.add(minorMoonPoints)

    return {
      def,
      mesh,
      mat,
      atmo,
      orbitLine,
      ring,
      minorMoonPoints,
      moons: moonRTs,
      ensureLoaded,
    }
  }

  private makeStars(): THREE.Points {
    const N = 1400
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      let x = Math.random() * 2 - 1
      let y = Math.random() * 2 - 1
      let z = Math.random() * 2 - 1
      const len = Math.sqrt(x * x + y * y + z * z) || 1
      const r = 60 + Math.random() * 120
      x = (x / len) * r
      y = (y / len) * r
      z = (z / len) * r
      pos.set([x, y, z], i * 3)
      const b = 0.2 + Math.random() * 0.45 // sparse and restrained, under bloom threshold
      col.set([b, b, Math.min(0.8, b + 0.1)], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const m = new THREE.PointsMaterial({
      size: 1.0,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
    this.starsMat = m
    const p = new THREE.Points(g, m)
    p.frustumCulled = false
    return p
  }

  /** Shift Earth right of center on wide layouts to make room for the panel. */
  private applyViewOffset() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    if (w >= 1024 && w > h) {
      // shift Earth right and slightly down, keeping it clear of the HUD
      this.camera.setViewOffset(
        w,
        h,
        -Math.round(w * 0.09),
        -Math.round(h * 0.05),
        w,
        h,
      )
    } else {
      this.camera.clearViewOffset()
    }
  }

  /**
   * Pixel-budget DPR control: a 4K/high-DPI viewport with EffectComposer +
   * bloom can otherwise allocate several hundred MB of framebuffers and lose
   * the WebGL context on integrated GPUs.
   */
  private computeDpr(w: number, h: number): number {
    const pixelBudgetDpr = Math.sqrt(25_000_000 / (w * h))
    return Math.max(
      0.5,
      Math.min(window.devicePixelRatio || 1, this.qualityCap, pixelBudgetDpr),
    )
  }

  /** Apply container size + DPR; a no-op when neither actually changed. */
  private applySize = () => {
    this.canvasRect = this.renderer.domElement.getBoundingClientRect()
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    const dpr = this.computeDpr(w, h)
    if (w === this.appliedW && h === this.appliedH && dpr === this.appliedDpr) return
    this.appliedW = w
    this.appliedH = h
    this.appliedDpr = dpr
    this.camera.aspect = w / h
    this.applyViewOffset()
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h)
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(w, h)
    for (const g of this.groups) g.mat.uniforms.uPixelRatio.value = dpr
    if (this.replacement) {
      for (const g of this.replacement) g.mat.uniforms.uPixelRatio.value = dpr
    }
  }

  /** Track set currently receiving propagation buffers. */
  private newestGroups(): GroupRuntime[] {
    return this.replacement ?? this.groups
  }

  private disposeGroups(list: GroupRuntime[]) {
    for (const g of list) {
      this.scene.remove(g.points)
      g.points.geometry.dispose()
      g.mat.dispose()
    }
  }

  /**
   * Atomic dataset replacement: the old groups (retiredGroups) stay visible
   * while the replacement is built HIDDEN and its worker warms up. Only when
   * the replacement's first valid interval arrives does `revealReplacement`
   * swap visibility — satellites never disappear during a data upgrade.
   */
  buildSatellites(defs: { color: string; size: number; count: number }[]) {
    // discard a previous never-revealed replacement, keep the visible set
    if (this.replacement) {
      this.disposeGroups(this.replacement)
      this.replacement = null
    }
    const list: GroupRuntime[] = []
    let offset = 0
    for (const def of defs) {
      const n = Math.max(def.count, 1)
      const geo = new THREE.BufferGeometry()
      const p0 = new Float32Array(n * 3)
      const v0 = new Float32Array(n * 3)
      const p1 = new Float32Array(n * 3)
      const v1 = new Float32Array(n * 3)
      const col = new Float32Array(n * 3)
      const siz = new Float32Array(n)
      const c = new THREE.Color(def.color)
      for (let i = 0; i < n; i++) {
        col.set([c.r, c.g, c.b], i * 3)
        siz[i] = def.size
      }
      geo.setAttribute('position', new THREE.BufferAttribute(p0, 3))
      geo.setAttribute('aV0', new THREE.BufferAttribute(v0, 3))
      geo.setAttribute('aP1', new THREE.BufferAttribute(p1, 3))
      geo.setAttribute('aV1', new THREE.BufferAttribute(v1, 3))
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
      geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1))
      const mat = new THREE.ShaderMaterial({
        vertexShader: SAT_VERT,
        fragmentShader: SAT_FRAG,
        uniforms: {
          uS: { value: 0 },
          uDur: { value: 1 },
          uScale: { value: 1 },
          uPixelRatio: { value: this.appliedDpr || 1 },
          uIntensity: { value: 2.1 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true, // Earth hides far-side satellites
      })
      const points = new THREE.Points(geo, mat)
      points.frustumCulled = false
      points.visible = false // hidden until first valid interval arrives
      this.scene.add(points)
      list.push({
        points,
        mat,
        offset,
        count: def.count,
        p0,
        v0,
        p1,
        v1,
        sizes: siz,
      })
      offset += def.count
    }
    this.replacement = list
  }

  /** Swap the hidden replacement in and dispose of the retired groups. */
  revealReplacement() {
    if (!this.replacement) return
    const retired = this.groups
    this.groups = this.replacement
    this.replacement = null
    // restore each group's enabled/disabled state
    for (let i = 0; i < this.groups.length; i++) {
      this.groups[i].points.visible = this.desiredVisible[i] !== false
    }
    this.disposeGroups(retired)
  }

  setGroupVisible(i: number, v: boolean) {
    this.desiredVisible[i] = v
    if (this.groups[i] && !this.replacement) this.groups[i].points.visible = v
  }

  /** Receive a new two-sample SGP4 interval (flat arrays across all groups). */
  updateInterval(
    t0Ms: number,
    t1Ms: number,
    p0: Float32Array,
    v0: Float32Array,
    p1: Float32Array,
    v1: Float32Array,
  ) {
    for (const g of this.newestGroups()) {
      const o = g.offset * 3
      const n = g.count * 3
      g.p0.set(p0.subarray(o, o + n))
      g.v0.set(v0.subarray(o, o + n))
      g.p1.set(p1.subarray(o, o + n))
      g.v1.set(v1.subarray(o, o + n))
      const at = g.points.geometry.attributes
      ;(at.position as THREE.BufferAttribute).needsUpdate = true
      ;(at.aV0 as THREE.BufferAttribute).needsUpdate = true
      ;(at.aP1 as THREE.BufferAttribute).needsUpdate = true
      ;(at.aV1 as THREE.BufferAttribute).needsUpdate = true
      g.mat.uniforms.uDur.value = Math.max((t1Ms - t0Ms) / 1000, 0.001)
    }
    this.t0 = t0Ms / 1000
    this.t1 = t1Ms / 1000
  }

  setShowOrbit(v: boolean) {
    this.showOrbit = v
    this.orbitPast.visible = v && this.selected !== null
    this.orbitFuture.visible = v && this.selected !== null
    this.lastOrbitSim = -1e15
  }

  setShowFootprint(v: boolean) {
    this.showFoot = v
    this.footLine.visible = v && this.selected !== null
  }

  setFollow(v: boolean) {
    this.follow = v
  }

  setSelected(index: number | null, color?: string) {
    this.selected = index
    this.marker.visible = index !== null
    if (color) this.marker.material.color.set(color)
    this.orbitPast.visible = index !== null && this.showOrbit
    this.orbitFuture.visible = index !== null && this.showOrbit
    this.footLine.visible = index !== null && this.showFoot
    this.signalCone.visible = index !== null && this.showFoot
    this.lastOrbitSim = -1e15
    if (index === null) {
      this.pastGeo.setDrawRange(0, 0)
      this.futureGeo.setDrawRange(0, 0)
      this.footGeo.setDrawRange(0, 0)
      this.signalCone.visible = false
      this.controls.target.set(0, 0, 0)
    }
  }

  /** Zero the size of satellites that failed to propagate (dead/decayed). */
  markDead(globalIndices: number[]) {
    for (const g of this.groups) {
      const attr = g.points.geometry.getAttribute('aSize') as THREE.BufferAttribute
      let dirty = false
      for (const idx of globalIndices) {
        if (idx >= g.offset && idx < g.offset + g.count) {
          attr.setX(idx - g.offset, 0)
          g.sizes[idx - g.offset] = 0
          dirty = true
        }
      }
      if (dirty) attr.needsUpdate = true
    }
  }

  /** Current interpolated ECI position of a satellite (unit space). */
  eciPosition(index: number, out: THREE.Vector3): THREE.Vector3 | null {
    const simS = this.cb.getSimTime() / 1000
    const dur = Math.max(this.t1 - this.t0, 0.001)
    const s = Math.min(Math.max((simS - this.t0) / dur, 0), 1)
    const s2 = s * s
    const s3 = s2 * s
    const h00 = 2 * s3 - 3 * s2 + 1
    const h10 = s3 - 2 * s2 + s
    const h01 = -2 * s3 + 3 * s2
    const h11 = s3 - s2
    for (const g of this.groups) {
      if (index >= g.offset && index < g.offset + g.count) {
        const i = (index - g.offset) * 3
        out.set(
          h00 * g.p0[i] + h10 * dur * g.v0[i] + h01 * g.p1[i] + h11 * dur * g.v1[i],
          h00 * g.p0[i + 1] + h10 * dur * g.v0[i + 1] + h01 * g.p1[i + 1] + h11 * dur * g.v1[i + 1],
          h00 * g.p0[i + 2] + h10 * dur * g.v0[i + 2] + h01 * g.p1[i + 2] + h11 * dur * g.v1[i + 2],
        )
        return out
      }
    }
    return null
  }

  /** Segment camera->satellite versus Earth sphere. */
  private isOccluded(p: THREE.Vector3): boolean {
    const c = this.camera.position
    // visible hemisphere test
    if (p.dot(this.tmpV2.copy(c).normalize()) < -0.05) {
      // still might be visible near the limb; fall through to precise test
    }
    const dx = p.x - c.x
    const dy = p.y - c.y
    const dz = p.z - c.z
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (len < 1e-6) return false
    const b = (c.x * dx + c.y * dy + c.z * dz) / len // C . dir
    const cc = c.x * c.x + c.y * c.y + c.z * c.z - EARTH_R_SCENE * EARTH_R_SCENE
    const disc = b * b - cc
    if (disc <= 0) return false
    const t = -b - Math.sqrt(disc)
    return t > 0 && t < len - 1e-3
  }

  /** Nearest selectable satellite to a screen point (client coords). */
  private pick(clientX: number, clientY: number, thresholdPx: number): number | null {
    if (this.replacement) return null
    if (this.focusTarget !== 'earth') return null // only pick Earth satellites when active target is Earth
    const rect = this.canvasRect
    const x = clientX - rect.left
    const y = clientY - rect.top

    // Hoisted once per call instead of once per satellite (was: this.eciPosition()
    // recomputing this on every one of ~9,400 satellites, calling getSimTime() each time).
    const simS = this.cb.getSimTime() / 1000
    const dur = Math.max(this.t1 - this.t0, 0.001)
    const s = Math.min(Math.max((simS - this.t0) / dur, 0), 1)
    const s2 = s * s
    const s3 = s2 * s
    const h00 = 2 * s3 - 3 * s2 + 1
    const h10 = s3 - 2 * s2 + s
    const h01 = -2 * s3 + 3 * s2
    const h11 = s3 - s2

    const v = this.tmpV // holds the unprojected ECI position of the candidate under test
    const vp = this.tmpV2 // scratch for the projected (NDC) copy — v must stay unprojected for isOccluded()
    let best: number | null = null
    let bestD = thresholdPx
    for (const g of this.groups) {
      if (!g.points.visible) continue
      for (let i = 0; i < g.count; i++) {
        if (g.sizes[i] === 0) continue // dead/decayed
        const i3 = i * 3
        v.set(
          h00 * g.p0[i3] + h10 * dur * g.v0[i3] + h01 * g.p1[i3] + h11 * dur * g.v1[i3],
          h00 * g.p0[i3 + 1] + h10 * dur * g.v0[i3 + 1] + h01 * g.p1[i3 + 1] + h11 * dur * g.v1[i3 + 1],
          h00 * g.p0[i3 + 2] + h10 * dur * g.v0[i3 + 2] + h01 * g.p1[i3 + 2] + h11 * dur * g.v1[i3 + 2],
        )
        if (v.lengthSq() < 1) continue // inside Earth
        vp.copy(v).project(this.camera)
        if (vp.z > 1) continue
        const sx = (vp.x * 0.5 + 0.5) * rect.width
        const sy = (-vp.y * 0.5 + 0.5) * rect.height
        if (sx < -20 || sx > rect.width + 20 || sy < -20 || sy > rect.height + 20) continue
        const d = Math.hypot(sx - x, sy - y)
        if (d < bestD) {
          // v still holds the unprojected position computed above — no need to recompute it
          if (this.isOccluded(v)) continue
          bestD = d
          best = g.offset + i
        }
      }
    }
    return best
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downPos = { x: e.clientX, y: e.clientY }
    this.isPointerDown = true
    this.controls.autoRotate = false
  }

  private onPointerUp = (e: PointerEvent) => {
    this.isPointerDown = false
    const moved = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y)
    if (moved > 5) return // globe drag — never a selection
    const idx = this.pick(e.clientX, e.clientY, 12)
    this.cb.onSelect(idx)
    if (idx === null) {
      const rect = this.canvasRect
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, this.camera)

      // Test all celestial bodies in 3D scene (Earth, Moon, Sun, Planets, Moons)
      const pickables: { mesh: THREE.Mesh; id: CelestialBodyId; name: string }[] = [
        { mesh: this.earth, id: 'earth', name: '🌍 EARTH' },
        { mesh: this.moon, id: 'moon', name: '🌕 MOON' },
        { mesh: this.sun, id: 'sun', name: '☀️ SUN' },
      ]
      const collectPrt = (list: PlanetRuntime[]) => {
        for (const prt of list) {
          pickables.push({
            mesh: prt.mesh,
            id: prt.def.id,
            name: `${prt.def.emoji} ${prt.def.name.toUpperCase()}`,
          })
          collectPrt(prt.moons)
        }
      }
      collectPrt(this.planetRuntimes)

      const meshesToTest = pickables.map((p) => p.mesh)
      const hits = raycaster.intersectObjects(meshesToTest, true)

      if (hits.length > 0) {
        const hit = hits[0]
        const hitObject = hit.object
        const siteFromSprite: LandingSite | null = (hitObject.userData as { site?: LandingSite })?.site ?? null

        let topMesh: THREE.Mesh | null = null
        let match: { mesh: THREE.Mesh; id: CelestialBodyId; name: string } | undefined
        let curr: THREE.Object3D | null = hitObject
        while (curr) {
          match = pickables.find((p) => p.mesh === curr)
          if (match) {
            topMesh = match.mesh
            break
          }
          curr = curr.parent
        }

        if (match && topMesh) {
          const pt = hit.point
          const localPt = pt.clone().sub(topMesh.position).applyMatrix4(topMesh.matrixWorld.clone().invert()).normalize()
          const lat = Math.asin(Math.min(Math.max(localPt.z, -1), 1)) * (180 / Math.PI)
          const lon = Math.atan2(localPt.y, localPt.x) * (180 / Math.PI)
          const site = siteFromSprite ?? findLandingSiteNear(match.id, lat, lon)
          if (site) {
            this.pinMarker.position.copy(pt.clone().add(pt.clone().sub(topMesh.position).normalize().multiplyScalar(0.01)))
            this.pinMarker.visible = true
          } else {
            this.pinMarker.visible = false
          }
          const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`
          const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

          this.cb.onSelectBody?.(match.id)
          this.cb.onPinSelected?.({ lat, lon, text: `${match.name}: ${latStr}, ${lonStr}`, landingSite: site })
          return
        }
      }
    } else {
      this.pinMarker.visible = false
      this.cb.onPinSelected?.(null)
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.isPointerDown) return // dragging (OrbitControls rotate) — skip picking
    const now = performance.now()
    if (now - this.lastHoverCheck < 120) return
    this.lastHoverCheck = now
    const idx = this.pick(e.clientX, e.clientY, 8)
    if (idx !== this.hoverIdx) {
      this.hoverIdx = idx
      this.renderer.domElement.style.cursor = idx !== null ? 'pointer' : 'grab'
    }
    this.cb.onHover(idx, e.clientX, e.clientY)
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    this.contextLost = true
    cancelAnimationFrame(this.raf)
    this.cb.onContextLost()
  }

  private onContextRestored = () => {
    this.contextLost = false
    this.cb.onContextRestored()
    this.loop()
  }

  private onVisibility = () => {
    this.hidden = document.hidden
    if (!this.hidden && !this.contextLost && !this.disposed) {
      cancelAnimationFrame(this.raf)
      this.loop()
    }
  }

  private updateSun(simMs: number, sunPosition: CartesianPosition) {
    this.sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z)
    this.tmpVec1.copy(this.sun.position).normalize()
    ;(this.earthMat.uniforms.uSunDir.value as THREE.Vector3).copy(this.tmpVec1)
    if (this.moonMat.uniforms.uSunDir) {
      ;(this.moonMat.uniforms.uSunDir.value as THREE.Vector3).copy(this.tmpVec1)
    }
    this.sun.rotation.y = (simMs / 1000) * 0.00005
  }

  /** FPS meter + quality cap reduction if the device cannot keep up. */
  private monitorPerf(now: number) {
    // fps meter, reported ~once per second
    this.fpsCount++
    if (this.fpsWindowStart === 0) this.fpsWindowStart = now
    const windowMs = now - this.fpsWindowStart
    if (windowMs >= 1000) {
      this.cb.onFps?.(Math.round((this.fpsCount * 1000) / windowMs))
      this.fpsCount = 0
      this.fpsWindowStart = now
    }
    if (this.dprReduced) return
    if (this.lastFrameT) this.frameTimes.push(now - this.lastFrameT)
    if (this.frameTimes.length >= 120) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.frameTimes.length = 0
      if (avg > 40 && this.qualityCap > 1) {
        this.dprReduced = true
        this.qualityCap = 1
        this.applySize()
      }
    }
    this.lastFrameT = now
  }

  private loop = () => {
    if (this.disposed || this.contextLost) return
    if (this.hidden) return // paused while the tab is hidden
    this.raf = requestAnimationFrame(this.loop)
    const simMs = this.cb.getSimTime()
    const simS = simMs / 1000

    this.reusableDate.setTime(simMs)
    this.earth.rotation.z = satellite.gstime(this.reusableDate)
    this.clouds.rotation.z = (simS * 0.00015) + (performance.now() * 0.00003)
    this.earthMat.uniforms.uTime.value = performance.now() * 0.001
    this.moonMat.uniforms.uTime.value = performance.now() * 0.001
    this.sunMat.uniforms.uTime.value = performance.now() * 0.001
    ;(this.sunCorona.material as THREE.ShaderMaterial).uniforms.uTime.value = performance.now() * 0.001
    const planetPositions = getGeocentricScenePositions(simMs)
    this.updateSun(simMs, planetPositions.sun)
    if (this.probeGroup?.visible) {
      for (const probe of this.probeGroup.children) {
        const offset = probe.userData.offset
        const anchor = probe.userData.anchor
        const definition = probe.userData.probe as DeepSpaceProbe | undefined
        if (!(offset instanceof THREE.Vector3) || !definition || (anchor !== 'earth' && anchor !== 'sun')) {
          throw new Error(`Invalid probe scene metadata: ${probe.name || 'unnamed probe'}`)
        }
        const distance = compressDistanceAu(probeDistanceAuAt(definition, simMs))
        offset.set(
          Math.cos(definition.angleRad) * distance,
          Math.sin(definition.angleRad) * Math.cos(definition.inclinationRad) * distance,
          Math.sin(definition.angleRad) * Math.sin(definition.inclinationRad) * distance,
        )
        probe.position.copy(offset)
        if (anchor === 'sun') probe.position.add(this.sun.position)
      }
    }
    ;(this.cloudsMat.uniforms.uSunDir.value as THREE.Vector3).copy(
      this.earthMat.uniforms.uSunDir.value as THREE.Vector3,
    )

    // --- Moon animation & orbit positioning ---
    const moonPosition = getSatelliteScenePosition('moon', simMs)
    this.moon.position.set(moonPosition.x, moonPosition.y, moonPosition.z)
    this.moon.rotation.z =
      (((simMs - J2000_MS) / (27.322 * 86400000)) * Math.PI * 2 + Math.PI) %
      (Math.PI * 2)
    ;(this.moonMat.uniforms.uSunDir.value as THREE.Vector3).copy(
      this.earthMat.uniforms.uSunDir.value as THREE.Vector3,
    )

    // ── Planet Orbit Animation ────────────────────────────────────────────
    const sunPos = this.sun.position
    for (const prt of this.planetRuntimes) {
      this.animatePlanet(prt, simMs, sunPos, null, planetPositions)
    }

    if (this.asteroidSwarm && (this.asteroidSwarm.mainBelt.visible || this.asteroidSwarm.kuiperBelt.visible)) {
      // Throttled to ~8Hz real time (not sim time, so it stays responsive at any time-warp
      // multiplier): belt orbital motion is on the order of 1e-9 rad/rendered-frame at 1x,
      // still sub-pixel per update even at 240x warp, so rebuilding all 3,600 instance
      // matrices every rendered frame was pure waste.
      const nowReal = performance.now()
      if (nowReal - this.lastAsteroidUpdateReal >= 125) {
        this.lastAsteroidUpdateReal = nowReal
        this.asteroidSwarm.update(simS)
      }
    }

    // Camera Fly-To & Up-Close Focus Lerping — supports all celestial bodies
    if (this.isCinematicTourActive) {
      const now = performance.now()
      const audioElapsedS = (now - this.tourStartTime) / 1000
      if (audioElapsedS >= this.tourAudioDurationS) {
        this.stopCinematicTour()
        this.cb.onTourEnded?.()
        return
      }

      const nextCueIndex = getCinematicTourCueIndex(audioElapsedS, this.tourAudioDurationS)
      if (nextCueIndex !== this.tourTargetIndex) {
        this.tourTargetIndex = nextCueIndex
        const nextBody = TOUR_SEQUENCE[this.tourTargetIndex]
        this.setFocusTarget(nextBody)
        this.cb.onTargetChanged?.(nextBody)
      }

      const tourBodyId = TOUR_SEQUENCE[this.tourTargetIndex]
      const targetInfo = this.getTargetBodyInfo(tourBodyId)
      if (targetInfo) {
        const bodyPos = this.tmpVec2
        targetInfo.mesh.getWorldPosition(bodyPos)
        const cueWindow = getCinematicTourCueWindow(this.tourTargetIndex, this.tourAudioDurationS)
        const cueProgress = Math.min(
          1,
          Math.max(0, (audioElapsedS - cueWindow.startS) / cueWindow.durationS),
        )

        const r = Math.max(0.4, targetInfo.radius * 3.4)
        const orbitAngle = 0.45 + cueProgress * Math.PI * 1.25
        const heightWave = Math.sin(cueProgress * Math.PI) * (r * 0.35)

        const camTargetPos = this.tmpVec4.set(
          bodyPos.x + Math.cos(orbitAngle) * r,
          bodyPos.y + heightWave,
          bodyPos.z + Math.sin(orbitAngle) * r,
        )

        this.controls.target.lerp(bodyPos, 0.08)
        this.camera.position.lerp(camTargetPos, 0.06)
        this.controls.update()
      }
    } else if (this.flyToActive) {
      const targetInfo = this.getTargetBodyInfo(this.focusTarget)
      if (targetInfo) {
        const currentTargetPos = this.tmpVec2
        targetInfo.mesh.getWorldPosition(currentTargetPos)
        const targetRadius = targetInfo.radius

        const elapsed = performance.now() - this.flyToStartTime
        const progress = Math.min(1, elapsed / 800)
        const ease = 1 - Math.pow(1 - progress, 3)

        const dir = this.tmpVec3.copy(this.flyToStartCam).sub(this.flyToStartTarget).normalize()
        if (dir.lengthSq() < 0.01 || !isFinite(dir.x)) dir.set(0, -1, 0.5).normalize()
        const endCamPos = this.tmpVec4.copy(currentTargetPos).add(dir.multiplyScalar(Math.max(0.20, targetRadius * 3.4)))

        this.controls.target.lerpVectors(this.flyToStartTarget, currentTargetPos, ease)
        this.camera.position.lerpVectors(this.flyToStartCam, endCamPos, ease)
        this.controls.update()

        if (progress >= 1) {
          this.flyToActive = false
          this.lastFocusPos.copy(currentTargetPos)
          this.hasLastFocusPos = true
        }
      }
    } else {
      // Lock-on tracking for moving celestial bodies
      const targetInfo = this.getTargetBodyInfo(this.focusTarget)
      if (targetInfo) {
        const currentTargetPos = this.tmpVec2
        targetInfo.mesh.getWorldPosition(currentTargetPos)
        if (this.hasLastFocusPos) {
          const delta = this.tmpVec3.copy(currentTargetPos).sub(this.lastFocusPos)
          this.camera.position.add(delta)
          this.controls.target.add(delta)
        } else {
          this.controls.target.copy(currentTargetPos)
        }
        this.lastFocusPos.copy(currentTargetPos)
        this.hasLastFocusPos = true
      } else if (this.selected === null && !this.follow) {
        this.controls.target.lerp(this.tmpVec1.set(0, 0, 0), 0.08)
        this.hasLastFocusPos = false
      }
    }

    const uS = Math.min(Math.max(simS - this.t0, 0), Math.max(this.t1 - this.t0, 0.001))
    for (const g of this.groups) g.mat.uniforms.uS.value = uS

    if (this.selected !== null) {
      const p = this.eciPosition(this.selected, this.tmpV)
      if (p) {
        this.marker.position.copy(p)
        const pulse = 0.045 + 0.01 * Math.sin(performance.now() * 0.005)
        this.marker.scale.setScalar(pulse)

        // Permanently hide signalCone to ensure Earth stays clean without giant cyan circles
        this.signalCone.visible = false

        if (this.follow) {
          this.controls.target.lerp(p, 0.15)
          const camOffset = this.tmpVec2.copy(p).normalize().multiplyScalar(2.2)
          this.camera.position.lerp(this.tmpVec4.copy(p).add(camOffset), 0.08)
        }
      }
      const nowReal = performance.now()
      if (
        this.showOrbit &&
        nowReal - this.lastOrbitReal > 400 &&
        Math.abs(simMs - this.lastOrbitSim) > 6000
      ) {
        const pa = this.pastGeo.getAttribute('position') as THREE.BufferAttribute
        const fu = this.futureGeo.getAttribute('position') as THREE.BufferAttribute
        this.cb.orbitProvider(
          this.selected,
          simMs,
          pa.array as Float32Array,
          fu.array as Float32Array,
        )
        this.pastGeo.setDrawRange(0, ORBIT_SIDE)
        this.futureGeo.setDrawRange(0, ORBIT_SIDE)
        pa.needsUpdate = true
        fu.needsUpdate = true
        this.lastOrbitReal = nowReal
        this.lastOrbitSim = simMs
      }
      if (this.showFoot && nowReal - this.lastFootReal > 250) {
        this.lastFootReal = nowReal
        const f = this.cb.footprintProvider(this.selected, simMs)
        if (f) {
          const attr = this.footGeo.getAttribute('position') as THREE.BufferAttribute
          const arr = attr.array as Float32Array
          const c = new THREE.Vector3(f.x, f.y, f.z).normalize()
          const up = Math.abs(c.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
          const t1v = new THREE.Vector3().crossVectors(c, up).normalize()
          const t2v = new THREE.Vector3().crossVectors(c, t1v).normalize()
          const R = 1.0028
          const cosA = Math.cos(f.ang)
          const sinA = Math.sin(f.ang)
          for (let i = 0; i <= FOOT_POINTS; i++) {
            const a = (i / FOOT_POINTS) * Math.PI * 2
            const dx = Math.cos(a) * sinA
            const dy = Math.sin(a) * sinA
            arr.set(
              [
                (c.x * cosA + t1v.x * dx + t2v.x * dy) * R,
                (c.y * cosA + t1v.y * dx + t2v.y * dy) * R,
                (c.z * cosA + t1v.z * dx + t2v.z * dy) * R,
              ],
              i * 3,
            )
          }
          this.footGeo.setDrawRange(0, FOOT_POINTS + 1)
          attr.needsUpdate = true
        } else {
          this.footGeo.setDrawRange(0, 0)
        }
      }
    }

    this.controls.update()
    this.composer.render()
    this.monitorPerf(performance.now())
  }

  private animatePlanet(
    prt: PlanetRuntime,
    simMs: number,
    sunPos: THREE.Vector3,
    parentPos: THREE.Vector3 | null,
    planetPositions: ReturnType<typeof getGeocentricScenePositions>,
  ) {
    const { def, mesh, mat, moons } = prt
    const position = def.parent
      ? getSatelliteScenePosition(def.id as SatelliteBodyId, simMs)
      : planetPositions[def.id as PlanetaryBodyId]
    if (!position) {
      throw new Error(`Missing scene position for celestial body: ${def.id}`)
    }
    if (parentPos) {
      mesh.position.set(
        parentPos.x + position.x,
        parentPos.y + position.y,
        parentPos.z + position.z,
      )
    } else {
      mesh.position.set(position.x, position.y, position.z)
    }
    if (def.id === 'pluto') {
      // JPL's heliocentric Pluto approximation represents the system barycenter.
      // Shift Pluto opposite Charon so both bodies orbit their shared center.
      const charon = getSatelliteScenePosition('charon', simMs)
      const charonMassFraction = 0.1085
      mesh.position.x -= charon.x * charonMassFraction
      mesh.position.y -= charon.y * charonMassFraction
      mesh.position.z -= charon.z * charonMassFraction
    }
    if (prt.orbitLine) prt.orbitLine.position.copy(parentPos ?? sunPos)

    const rotSign = def.retrograde ? -1 : 1
    const rotSpeed = (2 * Math.PI) / (def.rotationPeriodHours * 3600)
    mesh.rotation.z = ((simMs / 1000) * rotSpeed * rotSign) % (Math.PI * 2)

    // Calculate vector pointing from planet to Sun for accurate 3D lighting without garbage collection
    const bodySunDir = this.tmpVec1.copy(sunPos).sub(mesh.position).normalize()
    if (bodySunDir.lengthSq() < 0.001) bodySunDir.set(1, 0, 0)
    mat.uniforms.uTime.value = performance.now() * 0.001
    ;(mat.uniforms.uSunDir.value as THREE.Vector3).copy(bodySunDir)

    for (const m of moons) {
      this.animatePlanet(m, simMs, sunPos, mesh.position, planetPositions)
    }
  }

  private getTargetBodyInfo(id: CelestialBodyId): { mesh: THREE.Mesh; radius: number; name: string; ensureLoaded?: () => void } | null {
    if (id === 'earth') return { mesh: this.earth, radius: 1.0, name: '🌍 EARTH' }
    if (id === 'moon') return { mesh: this.moon, radius: 0.2727, name: '🌕 MOON' }
    if (id === 'sun') return { mesh: this.sun, radius: 2.5, name: '☀️ SUN' }

    const findInRuntimes = (list: PlanetRuntime[]): { mesh: THREE.Mesh; radius: number; name: string; ensureLoaded?: () => void } | null => {
      for (const prt of list) {
        if (prt.def.id === id) {
          return { mesh: prt.mesh, radius: prt.def.radius, name: `${prt.def.emoji} ${prt.def.name.toUpperCase()}`, ensureLoaded: prt.ensureLoaded }
        }
        const sub = findInRuntimes(prt.moons)
        if (sub) return sub
      }
      return null
    }
    return findInRuntimes(this.planetRuntimes)
  }

  /** Current viewport anchor for an in-scene celestial body. */
  getBodyScreenAnchor(id: CelestialBodyId): BodyScreenAnchor | null {
    const info = this.getTargetBodyInfo(id)
    if (!info) return null

    const rect = this.canvasRect
    if (rect.width === 0 || rect.height === 0) return null

    const center = this.tmpVec1
    const projected = this.tmpVec2
    const scale = this.tmpVec3
    info.mesh.getWorldPosition(center)
    const distance = this.camera.position.distanceTo(center)
    if (!Number.isFinite(distance) || distance <= 0) return null

    projected.copy(center).project(this.camera)
    if (projected.z < -1 || projected.z > 1) return null

    info.mesh.getWorldScale(scale)
    const worldRadius = info.radius * Math.max(scale.x, scale.y, scale.z)
    const radius = Math.max(
      12,
      (worldRadius / (distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2))) * (rect.height / 2),
    )

    return {
      x: rect.left + (projected.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-projected.y * 0.5 + 0.5) * rect.height,
      radius,
    }
  }

  startCinematicTour(audioDurationS: number) {
    if (!Number.isFinite(audioDurationS) || audioDurationS <= 0) {
      throw new Error(`Cinematic tour requires a valid narration duration, received ${audioDurationS}`)
    }
    this.isCinematicTourActive = true
    this.tourTargetIndex = 0
    this.tourAudioDurationS = audioDurationS
    this.tourStartTime = performance.now()
    const firstBody = TOUR_SEQUENCE[0]
    this.setFocusTarget(firstBody)
    this.cb.onTargetChanged?.(firstBody)
  }

  stopCinematicTour() {
    this.isCinematicTourActive = false
  }

  setEarthObservatoryEvents(events: EarthEvent[]) {
    let previousTexture: THREE.Texture | null = null
    for (const child of this.earthObservatoryMarkers.children) {
      if (child instanceof THREE.Sprite) {
        previousTexture ??= child.material.map
        child.material.dispose()
      }
    }
    previousTexture?.dispose()
    this.earthObservatoryMarkers.clear()
    if (events.length === 0) return

    const markerTexture = makeRingTexture()
    for (const event of events.slice(0, 48)) {
      const phi = (90 - event.lat) * (Math.PI / 180)
      const theta = (event.lon + 180) * (Math.PI / 180)
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: markerTexture,
          color: event.kind === 'earthquake' ? 0xfb923c : 0x34d399,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        }),
      )
      sprite.position.set(
        -(1.022 * Math.sin(phi) * Math.cos(theta)),
        1.022 * Math.cos(phi),
        1.022 * Math.sin(phi) * Math.sin(theta),
      )
      sprite.scale.setScalar(event.kind === 'earthquake' ? 0.038 : 0.032)
      sprite.userData = { earthEvent: event }
      this.earthObservatoryMarkers.add(sprite)
    }
    this.earthObservatoryMarkers.visible = this.focusTarget === 'earth'
  }

  setAuroraOverlay(points: AuroraPoint[]) {
    this.auroraOverlay.geometry.dispose()
    if (points.length === 0) {
      this.auroraOverlay.geometry = new THREE.BufferGeometry()
      this.auroraOverlay.visible = false
      return
    }
    const stride = Math.max(1, Math.ceil(points.length / 1200))
    const sampled = points.filter((_, index) => index % stride === 0)
    const positions = new Float32Array(sampled.length * 3)
    const colors = new Float32Array(sampled.length * 3)
    sampled.forEach((point, index) => {
      const phi = (90 - point.lat) * (Math.PI / 180)
      const theta = (point.lon + 180) * (Math.PI / 180)
      positions.set(
        [
          -(1.027 * Math.sin(phi) * Math.cos(theta)),
          1.027 * Math.cos(phi),
          1.027 * Math.sin(phi) * Math.sin(theta),
        ],
        index * 3,
      )
      const intensity = THREE.MathUtils.clamp(point.probability / 100, 0.1, 1)
      colors.set([0.22 + intensity * 0.35, 0.25 + intensity * 0.25, 0.75 + intensity * 0.25], index * 3)
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.auroraOverlay.geometry = geometry
    this.auroraOverlay.visible = this.focusTarget === 'earth'
  }

  showBodyCoordinate(bodyId: CelestialBodyId, lat: number, lon: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error(`Invalid ${bodyId} coordinate: lat=${lat}, lon=${lon}`)
    }
    const body = this.getTargetBodyInfo(bodyId)
    if (!body) throw new Error(`Cannot show coordinate for unknown body: ${bodyId}`)
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    const markerRadius = body.radius * 1.032
    const localPosition = new THREE.Vector3(
      -(markerRadius * Math.sin(phi) * Math.cos(theta)),
      markerRadius * Math.cos(phi),
      markerRadius * Math.sin(phi) * Math.sin(theta),
    )
    body.mesh.updateMatrixWorld(true)
    this.pinMarker.position.copy(localPosition.applyMatrix4(body.mesh.matrixWorld))
    this.pinMarker.visible = true
  }

  showEarthCoordinate(lat: number, lon: number) {
    this.showBodyCoordinate('earth', lat, lon)
  }

  // Upgrades only the colour texture to 8K on focus. Bump/specular are scalar
  // masks (height field, specular mask) sampled at a coarse UV offset for a
  // finite-difference gradient — the 2K versions loaded at startup are already
  // plenty of resolution, so there is no 8K bump/specular upgrade.
  private loadMoonHighResolution() {
    if (this.moonHighResolutionRequested) return
    this.moonHighResolutionRequested = true
    const loader = new THREE.TextureLoader()
    const path = `${import.meta.env.BASE_URL}textures/moon-8k.jpg`
    loader.loadAsync(path).then(
      (surface) => {
        if (this.disposed) {
          surface.dispose()
          return
        }
        surface.colorSpace = THREE.SRGBColorSpace
        surface.anisotropy = 16
        surface.needsUpdate = true
        surface.minFilter = THREE.LinearMipmapLinearFilter
        surface.magFilter = THREE.LinearFilter
        const previous = this.moonMat.uniforms.uMoonTex.value as THREE.Texture
        this.moonMat.uniforms.uMoonTex.value = surface
        previous.dispose()
      },
      (error: unknown) => {
        this.moonHighResolutionRequested = false
        console.error(
          `Moon 8K texture upgrade failed for ${path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      },
    )
  }

  setFocusTarget(target: CelestialBodyId) {
    const isSameTarget = this.focusTarget === target
    this.focusTarget = target
    this.pinMarker.visible = false
    this.marker.visible = false
    this.signalCone.visible = false
    this.earthObservatoryMarkers.visible = target === 'earth'
    this.auroraOverlay.visible =
      target === 'earth' && this.auroraOverlay.geometry.getAttribute('position') !== undefined
    const info = this.getTargetBodyInfo(target)
    if (!info) return
    if (target === 'moon') this.loadMoonHighResolution()
    info.ensureLoaded?.()

    // Dynamically adjust camera near clipping plane so small moons are never sliced off
    this.camera.near = Math.max(0.001, Math.min(0.1, info.radius * 0.08))
    this.camera.updateProjectionMatrix()

    this.controls.minDistance = Math.max(0.005, info.radius * 1.1)
    this.controls.maxDistance = 8000.0

    if (!isSameTarget || !this.flyToActive) {
      this.flyToActive = true
      this.flyToStartTime = performance.now()
      this.flyToStartCam.copy(this.camera.position)
      this.flyToStartTarget.copy(this.controls.target)
      this.hasLastFocusPos = false
    }
  }

  setTheme(theme: 'dark' | 'light') {
    this.currentTheme = theme
    if (theme === 'light') {
      // Cool daylight space keeps planet texture contrast while making the scene readable.
      this.scene.background = new THREE.Color(0xe8f1f6)
      this.renderer.setClearColor(0xe8f1f6, 1)
      if (this.starsMat) {
        this.starsMat.color.setHex(0x173a52)
        this.starsMat.opacity = 0.82
      }
      this.bloom.strength = 0.2
      this.bloom.radius = 0.12
      this.bloom.threshold = 1.05
    } else {
      // Deep Dark Space Theme
      this.scene.background = null
      this.renderer.setClearColor(0x000000, 1)
      if (this.starsMat) {
        this.starsMat.color.setHex(0xffffff)
        this.starsMat.opacity = 0.45
      }
      this.bloom.strength = 0.45
      this.bloom.radius = 0.25
      this.bloom.threshold = 0.98
    }
  }

  setPlanetaryOrbitsVisible(v: boolean) {
    if (this.moonOrbitLine) this.moonOrbitLine.visible = v
    for (const rt of this.planetRuntimes) {
      if (rt.orbitLine) rt.orbitLine.visible = v
      for (const m of rt.moons) {
        if (m.orbitLine) m.orbitLine.visible = v
      }
    }
  }

  setProbesVisible(v: boolean) {
    if (this.probeGroup) this.probeGroup.visible = v
  }

  setConstellationsVisible(vis: boolean) {
    if (this.constellationGroup) this.constellationGroup.visible = vis
  }

  setAsteroidsVisible(vis: boolean) {
    if (this.asteroidSwarm) {
      this.asteroidSwarm.mainBelt.visible = vis
      this.asteroidSwarm.kuiperBelt.visible = vis
    }
  }

  private makeProbes(): THREE.Group {
    const group = new THREE.Group()
    for (const p of DEEP_SPACE_PROBES) {
      if (!p.rendered) continue
      const dist = compressDistanceAu(p.distanceAu)
      const px = Math.cos(p.angleRad) * dist
      const py = Math.sin(p.angleRad) * Math.cos(p.inclinationRad) * dist
      const pz = Math.sin(p.angleRad) * Math.sin(p.inclinationRad) * dist

      // Deep space probe 3D marker (Cyan / Silver beacon)
      const geo = new THREE.SphereGeometry(0.08, 16, 16)
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.name = p.name
      mesh.userData.offset = new THREE.Vector3(px, py, pz)
      mesh.userData.anchor = p.id === 'jwst' ? 'earth' : 'sun'
      mesh.userData.probe = p
      mesh.position.copy(mesh.userData.offset)

      group.add(mesh)
    }
    return group
  }

  private makeConstellations(): THREE.Group {
    const group = new THREE.Group()
    for (const c of CONSTELLATIONS) {
      const pts: THREE.Vector3[] = []
      for (const p of c.points) {
        pts.push(new THREE.Vector3(p[0], p[1], p[2]))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: 0x4477aa,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
      })
      const line = new THREE.LineSegments(geo, mat)
      group.add(line)
    }
    return group
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onPointerDown)
    el.removeEventListener('pointerup', this.onPointerUp)
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('webglcontextlost', this.onContextLost)
    el.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.resizeObserver?.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.controls.dispose()
    this.disposeGroups(this.groups)
    if (this.replacement) this.disposeGroups(this.replacement)
    this.groups = []
    this.replacement = null
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose()
        const mat = obj.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else if (mat) {
          const withMap = mat as THREE.Material & { map?: THREE.Texture }
          withMap.map?.dispose()
          mat.dispose()
        }
      }
    })
    for (const pass of this.composer.passes) {
      ;(pass as { dispose?: () => void }).dispose?.()
    }
    this.composer.dispose()
    this.renderer.dispose()
    el.remove()
  }
}
