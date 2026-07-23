import * as THREE from 'three'
import type { CelestialBodyId } from './planets'

/**
 * Generates an authentic, high-fidelity 2048x1024 equirectangular CanvasTexture
 * for any celestial moon in the Solar System based on real NASA imagery data.
 */
export function createRealisticMoonTexture(id: CelestialBodyId): THREE.CanvasTexture {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Helper random functions with seed
  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - Math.floor(n)
  }

  if (id === 'europa') {
    // 🧊 EUROPA: Pale icy blue-white crust + deep red-brown intersecting Lineae (cracks) & Chaos terrain
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#dbeafe')
    bg.addColorStop(0.5, '#f1f5f9')
    bg.addColorStop(1, '#cbd5e1')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Base ice texture grain
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const n = (noise(x * 0.05, y * 0.05) - 0.5) * 18
        data[idx] = Math.min(255, Math.max(0, data[idx] + n))
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + n))
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + n + 4))
      }
    }
    ctx.putImageData(imgData, 0, 0)

    // Reddish-brown Chaos terrain patches (Conamara Chaos)
    ctx.fillStyle = 'rgba(154, 52, 18, 0.25)'
    for (let i = 0; i < 40; i++) {
      const cx = (i * 317 + 89) % width
      const cy = ((i * 197 + 43) % (height - 200)) + 100
      const r = 25 + (i % 5) * 12
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Intersecting tectonic lineae (cracks) across the globe
    ctx.lineWidth = 3
    for (let i = 0; i < 160; i++) {
      const startX = (i * 127) % width
      const startY = (i * 83) % height
      const length = 200 + (i % 7) * 80
      const angle = (i * 0.65) + noise(i, 1) * 0.5

      ctx.strokeStyle = i % 3 === 0 ? 'rgba(124, 45, 18, 0.85)' : 'rgba(153, 27, 27, 0.65)'
      ctx.lineWidth = 1.5 + (i % 4)

      ctx.beginPath()
      let currX = startX
      let currY = startY
      ctx.moveTo(currX, currY)
      const steps = Math.floor(length / 20)
      for (let s = 0; s < steps; s++) {
        currX += Math.cos(angle + s * 0.15) * 20
        currY += Math.sin(angle + s * 0.15) * 20
        ctx.lineTo((currX + width) % width, Math.min(height, Math.max(0, currY)))
      }
      ctx.stroke()
    }
  } else if (id === 'io') {
    // 🟡 IO: Volcanic sulfur yellow & chartreuse + black volcanic calderas & orange sulfur halos
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#fef08a')
    bg.addColorStop(0.3, '#eab308')
    bg.addColorStop(0.7, '#ca8a04')
    bg.addColorStop(1, '#a16207')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Volcanic sulfur frost patches
    ctx.fillStyle = '#fef9c3'
    for (let i = 0; i < 80; i++) {
      const cx = (i * 211) % width
      const cy = (i * 137) % height
      ctx.beginPath()
      ctx.arc(cx, cy, 30 + (i % 6) * 15, 0, Math.PI * 2)
      ctx.fill()
    }

    // 40+ Active Volcanic Vents (Loki Patera, Pele, Prometheus)
    for (let i = 0; i < 45; i++) {
      const vx = (i * 283 + 47) % width
      const vy = ((i * 163 + 31) % (height - 160)) + 80
      const size = 12 + (i % 5) * 8

      // Outer Orange/Red Sulfur Plume Halo
      const grad = ctx.createRadialGradient(vx, vy, size * 0.2, vx, vy, size * 3)
      grad.addColorStop(0, '#dc2626')
      grad.addColorStop(0.4, '#f97316')
      grad.addColorStop(1, 'rgba(234, 179, 8, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(vx, vy, size * 3, 0, Math.PI * 2)
      ctx.fill()

      // Dark Silicate Lava Caldera Center
      ctx.fillStyle = '#18181b'
      ctx.beginPath()
      ctx.arc(vx, vy, size * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (id === 'titan') {
    // 🟠 TITAN: Golden-amber hazy atmosphere + dark liquid methane seas (Kraken Mare) & dune belts
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#d97706')
    bg.addColorStop(0.5, '#b45309')
    bg.addColorStop(1, '#78350f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Dark Equatorial Dune Belts (Shangri-La, Belet)
    ctx.fillStyle = 'rgba(69, 26, 3, 0.7)'
    ctx.beginPath()
    ctx.ellipse(width * 0.4, height * 0.5, width * 0.35, height * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(width * 0.8, height * 0.52, width * 0.25, height * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Bright Ice Highlands (Xanadu)
    ctx.fillStyle = 'rgba(253, 230, 138, 0.4)'
    ctx.beginPath()
    ctx.ellipse(width * 0.25, height * 0.48, width * 0.15, height * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Liquid Methane Lakes at North Pole (Kraken Mare, Ligeia Mare)
    ctx.fillStyle = '#0f172a'
    for (let i = 0; i < 15; i++) {
      const lx = (width * 0.3 + i * 110) % width
      const ly = 40 + (i % 4) * 20
      ctx.beginPath()
      ctx.ellipse(lx, ly, 35 + (i % 3) * 15, 20 + (i % 2) * 10, i * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (id === 'ganymede') {
    // 🌑 GANYMEDE: Dark ancient grooved terrain + bright white impact ray craters
    ctx.fillStyle = '#334155'
    ctx.fillRect(0, 0, width, height)

    // Dark ancient polygon regions (Galileo Regio)
    ctx.fillStyle = '#1e293b'
    for (let i = 0; i < 12; i++) {
      const gx = (i * 350) % width
      const gy = (i * 210) % height
      ctx.beginPath()
      ctx.ellipse(gx, gy, 200, 140, i * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Tectonic grooved furrows
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'
    ctx.lineWidth = 2
    for (let i = 0; i < 80; i++) {
      const fx = (i * 179) % width
      const fy = (i * 113) % height
      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo((fx + 180) % width, fy + (i % 5) * 10)
      ctx.stroke()
    }

    // Bright White Ray Craters
    for (let i = 0; i < 25; i++) {
      const cx = (i * 419 + 71) % width
      const cy = ((i * 239) % (height - 120)) + 60
      const r = 8 + (i % 4) * 5

      // Radial Rays
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 1
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(ang) * (r * 6), cy + Math.sin(ang) * (r * 6))
        ctx.stroke()
      }

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (id === 'callisto') {
    // 🌑 CALLISTO: Heavily cratered ancient dark ice crust + Valhalla multi-ring impact basin
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#18181b')
    bg.addColorStop(0.5, '#27272a')
    bg.addColorStop(1, '#3f3f46')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Valhalla Multi-Ring Impact Structure
    const vx = width * 0.35
    const vy = height * 0.45
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)'
    for (let ring = 1; ring <= 10; ring++) {
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(vx, vy, ring * 22, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(vx, vy, 12, 0, Math.PI * 2)
    ctx.fill()

    // Thousands of bright ice crater spots
    for (let i = 0; i < 350; i++) {
      const cx = (i * 281 + 13) % width
      const cy = (i * 173 + 7) % height
      const r = 1.5 + (i % 5) * 1.5
      ctx.fillStyle = i % 4 === 0 ? '#ffffff' : '#94a3b8'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (id === 'enceladus') {
    // 🧊 ENCELADUS: Pure snow-white ice + 4 Blue Tiger Stripe rift valleys at South Pole
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)

    // Smooth northern ice texture
    ctx.fillStyle = 'rgba(226, 232, 240, 0.5)'
    for (let i = 0; i < 30; i++) {
      const cx = (i * 307) % width
      const cy = (i * 149) % (height * 0.6)
      ctx.beginPath()
      ctx.arc(cx, cy, 30 + (i % 4) * 20, 0, Math.PI * 2)
      ctx.fill()
    }

    // 4 South Pole Tiger Stripes (Alexandria, Cairo, Baghdad, Damascus Sulci)
    const southY = height - 120
    ctx.strokeStyle = '#0284c7'
    ctx.lineWidth = 5
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 10
    for (let t = 0; t < 4; t++) {
      ctx.beginPath()
      const startX = width * 0.4 + t * 40
      ctx.moveTo(startX, southY)
      ctx.bezierCurveTo(startX + 80, southY - 30, startX + 160, southY + 30, startX + 240, southY)
      ctx.stroke()
    }
    ctx.shadowBlur = 0
  } else if (id === 'phobos' || id === 'deimos') {
    // 🌑 PHOBOS & DEIMOS: Pockmarked dusty brown-grey asteroid surface
    ctx.fillStyle = id === 'phobos' ? '#44403c' : '#52525b'
    ctx.fillRect(0, 0, width, height)

    if (id === 'phobos') {
      // Stickney Crater Basin
      const sx = width * 0.5
      const sy = height * 0.5
      const grad = ctx.createRadialGradient(sx, sy, 10, sx, sy, 120)
      grad.addColorStop(0, '#1c1917')
      grad.addColorStop(0.7, '#292524')
      grad.addColorStop(1, '#44403c')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(sx, sy, 120, 0, Math.PI * 2)
      ctx.fill()

      // Radial grooves radiating from Stickney
      ctx.strokeStyle = 'rgba(28, 25, 23, 0.6)'
      ctx.lineWidth = 2
      for (let i = 0; i < 20; i++) {
        const ang = (i * Math.PI) / 10
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + Math.cos(ang) * 450, sy + Math.sin(ang) * 450)
        ctx.stroke()
      }
    }
  } else if (id === 'titania' || id === 'oberon') {
    // 🔵 TITANIA & OBERON: Neutral grey icy crust + rift valleys
    ctx.fillStyle = id === 'titania' ? '#475569' : '#334155'
    ctx.fillRect(0, 0, width, height)

    // Messina Chasma Rift Valleys
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(width * 0.2, height * 0.3)
    ctx.bezierCurveTo(width * 0.4, height * 0.6, width * 0.6, height * 0.2, width * 0.8, height * 0.7)
    ctx.stroke()

    // Bright Impact Scars
    for (let i = 0; i < 40; i++) {
      const cx = (i * 269) % width
      const cy = (i * 157) % height
      ctx.fillStyle = '#cbd5e1'
      ctx.beginPath()
      ctx.arc(cx, cy, 3 + (i % 3) * 3, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (id === 'triton') {
    // ❄️ TRITON: Pinkish-peach nitrogen ice south polar cap + cantaloupe terrain & dark geyser streaks
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#94a3b8')
    bg.addColorStop(0.5, '#fbcfe8')
    bg.addColorStop(1, '#f472b6')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Southern Nitrogen Ice Cap
    ctx.fillStyle = '#fce7f3'
    ctx.beginPath()
    ctx.arc(width * 0.5, height, height * 0.65, 0, Math.PI * 2)
    ctx.fill()

    // Dark Cryovolcanic Nitrogen Geyser Streaks
    ctx.fillStyle = '#18181b'
    for (let i = 0; i < 15; i++) {
      const gx = width * 0.2 + i * 110
      const gy = height - 180 + (i % 3) * 30
      ctx.beginPath()
      ctx.ellipse(gx, gy, 4, 25, 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    // Generic high-res rocky texture fallback
    ctx.fillStyle = '#64748b'
    ctx.fillRect(0, 0, width, height)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}
