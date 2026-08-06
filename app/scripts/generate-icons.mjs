// Renders the ASTROBENDER favicon motif (planet circle + ring + moon dot,
// same colors as the inline SVG favicon in index.html) as PNG icons, sized
// for the web app manifest. No image library: PNG chunks are built by hand
// using Node's built-in zlib for the IDAT deflate stream.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type: RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idatData = deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Colors matching the existing favicon (index.html inline SVG).
const TEAL = [14, 116, 144]
const GREEN = [21, 128, 61]
const CYAN = [34, 211, 238]
const SKY = [56, 189, 248]
const NAVY_BG = [4, 6, 10]

function renderIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  // Maskable icons need an opaque background and content kept inside the
  // safe zone (inner ~80% of the canvas, per the manifest icon spec).
  const planetRadius = maskable ? size * 0.4 * 0.8 : size * 0.44
  const ringRadius = planetRadius * 1.28
  const ringWidth = Math.max(1, size * 0.018)
  const moonRadius = size * 0.045
  const moonX = cx + planetRadius * 0.95
  const moonY = cy - planetRadius * 0.65

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const moonDist = Math.sqrt((x - moonX) ** 2 + (y - moonY) ** 2)
      const ringDist = Math.abs(dist - ringRadius)

      let rgb
      let a = 255
      if (moonDist <= moonRadius) rgb = SKY
      else if (ringDist <= ringWidth / 2) rgb = CYAN
      else if (dist <= planetRadius * 0.95) rgb = GREEN
      else if (dist <= planetRadius) rgb = TEAL
      else if (maskable) rgb = NAVY_BG
      else {
        rgb = [0, 0, 0]
        a = 0
      }

      rgba[i] = rgb[0]
      rgba[i + 1] = rgb[1]
      rgba[i + 2] = rgb[2]
      rgba[i + 3] = a
    }
  }
  return encodePng(size, size, rgba)
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180.png', size: 180, maskable: true },
]

for (const { name, size, maskable } of targets) {
  const png = renderIcon(size, { maskable })
  writeFileSync(join(outDir, name), png)
  console.log(`Wrote ${name} (${size}x${size}, ${png.length} bytes)`)
}
