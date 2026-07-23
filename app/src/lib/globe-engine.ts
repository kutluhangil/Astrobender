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
import { DEEP_SPACE_PROBES } from './probes'
import { CONSTELLATIONS } from './constellations'
import { LANDING_SITES, findLandingSiteNear, type LandingSite } from './landing-sites'
import { createRealisticMoonTexture } from './moon-texture-generator'
import { createAsteroidSwarm, type AsteroidSwarm } from './asteroids'

/** Runtime state for a rendered planet or moon */
interface PlanetRuntime {
  def: PlanetDef
  mesh: THREE.Mesh
  mat: THREE.ShaderMaterial
  atmo?: THREE.Mesh
  orbitLine?: THREE.Line
  ring?: THREE.Mesh
  moons: PlanetRuntime[]
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
  float ps = aSize * uScale * uPixelRatio * (3.1 / -mv.z);
  gl_PointSize = clamp(ps, 1.0, 48.0);
}
`

const SAT_FRAG = /* glsl */ `
varying vec3 vColor;
uniform float uIntensity;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = smoothstep(0.30, 0.10, d);
  float halo = smoothstep(0.5, 0.12, d) * 0.5;
  vec3 col = vColor * (0.5 + uIntensity * core);
  gl_FragColor = vec4(col, max(halo, core));
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
  vec3 sunSpecColor = vec3(1.0, 0.95, 0.85) * specAmount * 1.2;
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
  gl_FragColor = vec4(0.35, 0.65, 1.15, 1.0) * intensity * 1.8;
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
  private moonOrbitLine: THREE.Line
  private earthLandmarks: THREE.Group
  private focusTarget: CelestialBodyId = 'earth'
  private planetRuntimes: PlanetRuntime[] = []
  private probeGroup: THREE.Group | null = null
  private constellationGroup: THREE.Group | null = null
  private asteroidSwarm: AsteroidSwarm | null = null
  private lastFocusPos: THREE.Vector3 | null = null
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
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.25

    // --- Earth ---
    const loader = new THREE.TextureLoader()
    const dayTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-day-8k.jpg`)
    const nightTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-night-8k.jpg`)
    const specTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-specular-8k.jpg`)
    const bumpTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-bump-8k.jpg`)

    dayTex.colorSpace = THREE.SRGBColorSpace
    nightTex.colorSpace = THREE.SRGBColorSpace
    dayTex.anisotropy = 16
    nightTex.anisotropy = 16
    specTex.anisotropy = 16
    bumpTex.anisotropy = 16
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

    // --- 8K Dynamic Cloud Layer ---
    const cloudsTex = loader.load(`${import.meta.env.BASE_URL}textures/earth-clouds-8k.jpg`)
    cloudsTex.colorSpace = THREE.SRGBColorSpace
    cloudsTex.anisotropy = 16
    const cloudGeo = new THREE.SphereGeometry(1.015, 256, 256)
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

    // --- Moon (8K Ultra HD) ---
    const moonTex = loader.load(`${import.meta.env.BASE_URL}textures/moon-8k.jpg`)
    const moonBumpTex = loader.load(`${import.meta.env.BASE_URL}textures/moon-bump-8k.jpg`)
    const moonSpecTex = loader.load(`${import.meta.env.BASE_URL}textures/moon-specular-8k.jpg`)

    moonTex.colorSpace = THREE.SRGBColorSpace
    moonTex.anisotropy = 16
    moonBumpTex.anisotropy = 16
    moonSpecTex.anisotropy = 16
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
    const MOON_ORBIT_R = 9.5
    const orbitPts: THREE.Vector3[] = []
    const moonSegs = 128
    const inc = (5.14 * Math.PI) / 180
    for (let i = 0; i <= moonSegs; i++) {
      const a = (i / moonSegs) * Math.PI * 2
      orbitPts.push(
        new THREE.Vector3(
          Math.cos(a) * MOON_ORBIT_R,
          Math.sin(a) * Math.cos(inc) * MOON_ORBIT_R,
          Math.sin(a) * Math.sin(inc) * MOON_ORBIT_R,
        ),
      )
    }
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

    // --- selective bloom: threshold 1.0 keeps Earth/stars out of the glow ---
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.55, 0.35, 1.0)
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
    const tex = def.parent
      ? createRealisticMoonTexture(def.id)
      : loader.load(`${import.meta.env.BASE_URL}textures/${def.texture}`)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 16
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter

    const geo = new THREE.SphereGeometry(def.radius, def.segments, def.segments)
    geo.rotateX(Math.PI / 2) // poles -> +z
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: tex },
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
        uniform vec3 uSunDir;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vec3 texCol = texture2D(uTex, vUv).rgb;
          float lit = dot(vNormalW, uSunDir);
          float day = smoothstep(-0.15, 0.35, lit);
          vec3 col = texCol * (0.06 + 0.94 * day);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = def.axialTilt * (Math.PI / 180)
    this.scene.add(mesh)

    // Atmosphere rim glow
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

    // Orbit line around the Sun
    const orbitPts: THREE.Vector3[] = []
    const orbSegs = 128
    const incRad = def.inclination * (Math.PI / 180)
    for (let i = 0; i <= orbSegs; i++) {
      const a = (i / orbSegs) * Math.PI * 2
      orbitPts.push(new THREE.Vector3(
        Math.cos(a) * def.orbitRadius,
        Math.sin(a) * Math.cos(incRad) * def.orbitRadius,
        Math.sin(a) * Math.sin(incRad) * def.orbitRadius,
      ))
    }
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

    // Saturn ring — 3D Shader with radial polar UV mapping
    let ring: THREE.Mesh | undefined
    if (def.hasRing) {
      const innerR = def.radius * 1.35
      const outerR = def.radius * 2.45
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 128)
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uRingTex: { value: loader.load(`${import.meta.env.BASE_URL}textures/saturn-ring-alpha.png`) },
          uInnerR: { value: innerR },
          uOuterR: { value: outerR },
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

          void main() {
            float r = length(vLocalPos.xy);
            float t = (r - uInnerR) / (uOuterR - uInnerR);
            t = clamp(t, 0.0, 1.0);

            vec4 ringCol = texture2D(uRingTex, vec2(t, 0.5));
            float edgeFade = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t));

            gl_FragColor = vec4(ringCol.rgb, ringCol.a * edgeFade * 0.92);
          }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
      ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      mesh.add(ring)
    }

    // Add historic landing sites to planet/moon surface
    const sites = LANDING_SITES.filter((s) => s.bodyId === def.id)
    if (sites.length > 0) {
      const landmarkGroup = new THREE.Group()
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

    return { def, mesh, mat, atmo, orbitLine, ring, moons: moonRTs }
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
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const v = this.tmpV
    let best: number | null = null
    let bestD = thresholdPx
    for (const g of this.groups) {
      if (!g.points.visible) continue
      for (let i = 0; i < g.count; i++) {
        if (g.sizes[i] === 0) continue // dead/decayed
        const idx = this.eciPosition(g.offset + i, v)
        if (!idx) continue
        if (v.lengthSq() < 1) continue // inside Earth
        v.project(this.camera)
        if (v.z > 1) continue
        const sx = (v.x * 0.5 + 0.5) * rect.width
        const sy = (-v.y * 0.5 + 0.5) * rect.height
        if (sx < -20 || sx > rect.width + 20 || sy < -20 || sy > rect.height + 20) continue
        const d = Math.hypot(sx - x, sy - y)
        if (d < bestD) {
          // precise occlusion check only for the current best candidate
          this.eciPosition(g.offset + i, v)
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
    this.controls.autoRotate = false
  }

  private onPointerUp = (e: PointerEvent) => {
    const moved = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y)
    if (moved > 5) return // globe drag — never a selection
    const idx = this.pick(e.clientX, e.clientY, 12)
    this.cb.onSelect(idx)
    if (idx === null) {
      const rect = this.renderer.domElement.getBoundingClientRect()
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

          this.setFocusTarget(match.id)
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

  private updateSun(simMs: number) {
    const jd = satellite.jday(new Date(simMs))
    const sun = satellite.sunPos(jd).rsun
    const len = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z) || 1
    const sunDir = new THREE.Vector3(sun.x / len, sun.y / len, sun.z / len)
    ;(this.earthMat.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir)
    this.sun.position.copy(sunDir.clone().multiplyScalar(120))
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
    this.updateSun(simMs)
    ;(this.cloudsMat.uniforms.uSunDir.value as THREE.Vector3).copy(
      this.earthMat.uniforms.uSunDir.value as THREE.Vector3,
    )

    // --- Moon animation & orbit positioning ---
    const MOON_ORBIT_R = 9.5
    const moonPeriodDays = 27.32
    const moonAngle = ((simS / (moonPeriodDays * 86400)) * Math.PI * 2) % (Math.PI * 2)
    const inc = (5.14 * Math.PI) / 180
    const mx = Math.cos(moonAngle) * MOON_ORBIT_R
    const my = Math.sin(moonAngle) * Math.cos(inc) * MOON_ORBIT_R
    const mz = Math.sin(moonAngle) * Math.sin(inc) * MOON_ORBIT_R
    this.moon.position.set(mx, my, mz)
    this.moon.rotation.z = moonAngle + Math.PI
    ;(this.moonMat.uniforms.uSunDir.value as THREE.Vector3).copy(
      this.earthMat.uniforms.uSunDir.value as THREE.Vector3,
    )

    // ── Planet Orbit Animation ────────────────────────────────────────────
    const sunPos = this.sun.position
    const sunDir = this.earthMat.uniforms.uSunDir.value as THREE.Vector3
    for (const prt of this.planetRuntimes) {
      this.animatePlanet(prt, simS, sunPos, sunDir, null)
    }

    if (this.asteroidSwarm && (this.asteroidSwarm.mainBelt.visible || this.asteroidSwarm.kuiperBelt.visible)) {
      this.asteroidSwarm.update(simS)
    }

    // Camera Fly-To & Up-Close Focus Lerping — supports all celestial bodies
    const targetInfo = this.getTargetBodyInfo(this.focusTarget)
    if (targetInfo) {
      const currentTargetPos = this.tmpVec2
      targetInfo.mesh.getWorldPosition(currentTargetPos)
      const targetRadius = targetInfo.radius

      if (this.flyToActive) {
        const elapsed = performance.now() - this.flyToStartTime
        const progress = Math.min(1, elapsed / 800)
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

        const dir = this.tmpVec3.copy(this.flyToStartCam).sub(this.flyToStartTarget).normalize()
        if (dir.lengthSq() < 0.01 || !isFinite(dir.x)) dir.set(0, -1, 0.5).normalize()
        const endCamPos = this.tmpVec4.copy(currentTargetPos).add(dir.multiplyScalar(Math.max(0.20, targetRadius * 3.2)))

        this.controls.target.lerpVectors(this.flyToStartTarget, currentTargetPos, ease)
        this.camera.position.lerpVectors(this.flyToStartCam, endCamPos, ease)
        this.controls.update()

        if (progress >= 1) {
          this.flyToActive = false
        }
      } else {
        // Lock-on tracking for moving celestial bodies
        if (this.lastFocusPos) {
          const delta = currentTargetPos.clone().sub(this.lastFocusPos)
          this.camera.position.add(delta)
          this.controls.target.add(delta)
        } else {
          this.controls.target.copy(currentTargetPos)
        }
      }
      this.lastFocusPos = currentTargetPos.clone()
    } else if (this.selected === null && !this.follow) {
      this.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08)
      this.lastFocusPos = null
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
          const camOffset = p.clone().normalize().multiplyScalar(2.2)
          this.camera.position.lerp(p.clone().add(camOffset), 0.08)
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
    simS: number,
    sunPos: THREE.Vector3,
    sunDir: THREE.Vector3,
    parentPos: THREE.Vector3 | null,
  ) {
    const { def, mesh, mat, moons } = prt
    const periodSec = def.orbitPeriodDays * 86400
    const angle = ((simS / periodSec) * Math.PI * 2) % (Math.PI * 2)
    const incRad = def.inclination * (Math.PI / 180)

    const relX = Math.cos(angle) * def.orbitRadius
    const relY = Math.sin(angle) * Math.cos(incRad) * def.orbitRadius
    const relZ = Math.sin(angle) * Math.sin(incRad) * def.orbitRadius

    const origin = parentPos ?? sunPos
    mesh.position.set(origin.x + relX, origin.y + relY, origin.z + relZ)

    const rotSign = def.retrograde ? -1 : 1
    const rotSpeed = (2 * Math.PI) / (def.rotationPeriodHours * 3600)
    mesh.rotation.z = (simS * rotSpeed * rotSign) % (Math.PI * 2)

    // Calculate vector pointing from planet to Sun for accurate 3D lighting without garbage collection
    const bodySunDir = this.tmpVec1.copy(sunPos).sub(mesh.position).normalize()
    if (bodySunDir.lengthSq() < 0.001) bodySunDir.set(1, 0, 0)
    mat.uniforms.uTime.value = performance.now() * 0.001
    ;(mat.uniforms.uSunDir.value as THREE.Vector3).copy(bodySunDir)

    for (const m of moons) {
      this.animatePlanet(m, simS, sunPos, sunDir, mesh.position)
    }
  }

  private getTargetBodyInfo(id: CelestialBodyId): { mesh: THREE.Mesh; radius: number; name: string } | null {
    if (id === 'earth') return { mesh: this.earth, radius: 1.0, name: '🌍 EARTH' }
    if (id === 'moon') return { mesh: this.moon, radius: 0.2727, name: '🌕 MOON' }
    if (id === 'sun') return { mesh: this.sun, radius: 2.5, name: '☀️ SUN' }

    const findInRuntimes = (list: PlanetRuntime[]): { mesh: THREE.Mesh; radius: number; name: string } | null => {
      for (const prt of list) {
        if (prt.def.id === id) {
          return { mesh: prt.mesh, radius: prt.def.radius, name: `${prt.def.emoji} ${prt.def.name.toUpperCase()}` }
        }
        const sub = findInRuntimes(prt.moons)
        if (sub) return sub
      }
      return null
    }
    return findInRuntimes(this.planetRuntimes)
  }

  setFocusTarget(target: CelestialBodyId) {
    this.focusTarget = target
    this.pinMarker.visible = false
    this.marker.visible = false
    this.signalCone.visible = false
    const info = this.getTargetBodyInfo(target)
    if (!info) return

    // Dynamically adjust camera near clipping plane so small moons are never sliced off
    this.camera.near = Math.max(0.001, Math.min(0.1, info.radius * 0.08))
    this.camera.updateProjectionMatrix()

    this.controls.minDistance = Math.max(0.005, info.radius * 1.1)
    this.controls.maxDistance = 8000.0

    this.flyToActive = true
    this.flyToStartTime = performance.now()
    this.flyToStartCam.copy(this.camera.position)
    this.flyToStartTarget.copy(this.controls.target)
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
      const px = Math.cos(p.angleRad) * p.distanceAu
      const py = Math.sin(p.angleRad) * Math.cos(p.inclinationRad) * p.distanceAu
      const pz = Math.sin(p.angleRad) * Math.sin(p.inclinationRad) * p.distanceAu

      // Deep space probe 3D marker (Amber Gold / Silver)
      const geo = new THREE.SphereGeometry(0.25, 16, 16)
      const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(px, py, pz)

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
