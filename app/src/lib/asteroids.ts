import * as THREE from 'three'
import { compressDistanceAu } from './orbital-mechanics'

/**
 * Deterministic schematic Asteroid & Kuiper Belt instanced swarm.
 * The belts communicate population regions and Keplerian speed ranges; their
 * individual instances are not cataloged JPL objects.
 */

export interface AsteroidSwarm {
  mainBelt: THREE.InstancedMesh
  kuiperBelt: THREE.InstancedMesh
  update: (simS: number) => void
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createAsteroidSwarm(sunPos: THREE.Vector3): AsteroidSwarm {
  // Create an irregular, cratered rock geometry
  const rockGeo = new THREE.DodecahedronGeometry(0.35, 1)
  const posAttr = rockGeo.attributes.position
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const y = posAttr.getY(i)
    const z = posAttr.getZ(i)
    const disp = (Math.sin(x * 5) * Math.cos(y * 5) * Math.sin(z * 5)) * 0.14
    posAttr.setXYZ(i, x + disp, y + disp, z + disp)
  }
  rockGeo.computeVertexNormals()

  // 1. Main Asteroid Belt (roughly 2.1 to 3.3 AU)
  // Realistic carbonaceous/silicate dark grey-brown rock material
  const mainCount = 2000
  const mainMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.85,
    metalness: 0.15,
    flatShading: true,
  })
  const mainBelt = new THREE.InstancedMesh(rockGeo, mainMat, mainCount)

  const mainData: { radius: number; angleOffset: number; speed: number; inc: number; yOffset: number }[] = []
  const dummy = new THREE.Object3D()
  const mainRandom = createSeededRandom(0xa57b3e1)

  for (let i = 0; i < mainCount; i++) {
    const distanceAu = 2.1 + mainRandom() * 1.2
    const radius = compressDistanceAu(distanceAu)
    const angleOffset = mainRandom() * Math.PI * 2
    const speed = (2 * Math.PI) / (365.25 * Math.pow(distanceAu, 1.5) * 86400)
    const inc = (mainRandom() - 0.5) * 0.18
    const yOffset = (mainRandom() - 0.5) * 4.0

    mainData.push({ radius, angleOffset, speed, inc, yOffset })
  }

  // 2. Kuiper Belt (roughly 30 to 50 AU)
  // Realistic dark slate icy grey material (no glowing cyan blue!)
  const kuiperCount = 1600
  const kuiperMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  })
  const kuiperBelt = new THREE.InstancedMesh(rockGeo, kuiperMat, kuiperCount)

  const kuiperData: { radius: number; angleOffset: number; speed: number; inc: number; yOffset: number }[] = []
  const kuiperRandom = createSeededRandom(0x4b015e2)

  for (let i = 0; i < kuiperCount; i++) {
    const distanceAu = 30 + kuiperRandom() * 20
    const radius = compressDistanceAu(distanceAu)
    const angleOffset = kuiperRandom() * Math.PI * 2
    const speed = (2 * Math.PI) / (365.25 * Math.pow(distanceAu, 1.5) * 86400)
    const inc = (kuiperRandom() - 0.5) * 0.22
    const yOffset = (kuiperRandom() - 0.5) * 7.0

    kuiperData.push({ radius, angleOffset, speed, inc, yOffset })
  }

  // Update function to animate 3D asteroid rotation & Keplerian orbits
  const update = (simS: number) => {
    for (let i = 0; i < mainCount; i++) {
      const d = mainData[i]
      const angle = d.angleOffset + simS * d.speed
      const x = sunPos.x + Math.cos(angle) * d.radius
      const y = sunPos.y + Math.sin(angle) * Math.cos(d.inc) * d.radius + d.yOffset
      const z = sunPos.z + Math.sin(angle) * Math.sin(d.inc) * d.radius

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(0.2 + (i % 3) * 0.1)
      dummy.rotation.set(simS * 0.0004 * ((i % 3) + 1), simS * 0.0007 * ((i % 2) + 1), 0)
      dummy.updateMatrix()
      mainBelt.setMatrixAt(i, dummy.matrix)
    }
    mainBelt.instanceMatrix.needsUpdate = true

    for (let i = 0; i < kuiperCount; i++) {
      const d = kuiperData[i]
      const angle = d.angleOffset + simS * d.speed
      const x = sunPos.x + Math.cos(angle) * d.radius
      const y = sunPos.y + Math.sin(angle) * Math.cos(d.inc) * d.radius + d.yOffset
      const z = sunPos.z + Math.sin(angle) * Math.sin(d.inc) * d.radius

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(0.25 + (i % 3) * 0.12)
      dummy.rotation.set(simS * 0.0003 * ((i % 3) + 1), simS * 0.0005 * ((i % 2) + 1), 0)
      dummy.updateMatrix()
      kuiperBelt.setMatrixAt(i, dummy.matrix)
    }
    kuiperBelt.instanceMatrix.needsUpdate = true
  }

  return { mainBelt, kuiperBelt, update }
}
