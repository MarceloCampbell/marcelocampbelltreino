import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function crc32(data) {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (const byte of data) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

// Creates a simple icon: solid background with white rounded "MC" visual
function createIcon(size) {
  const bg = { r: 0x64, g: 0xa1, b: 0xee } // #64A1EE
  const white = { r: 255, g: 255, b: 255 }

  // Draw pixels
  const pixels = []
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.5
  const innerR = size * 0.35

  for (let y = 0; y < size; y++) {
    pixels.push(0) // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      // White circle in center
      if (dist < innerR) {
        pixels.push(white.r, white.g, white.b)
      } else {
        pixels.push(bg.r, bg.g, bg.b)
      }
    }
  }

  const raw = Buffer.from(pixels)
  const compressed = zlib.deflateSync(raw)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512]
for (const size of sizes) {
  const png = createIcon(size)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), png)
  console.log(`  icon-${size}x${size}.png`)
}

// Apple touch icon (180x180)
fs.copyFileSync(
  path.join(iconsDir, 'icon-180x180.png'),
  path.join(iconsDir, 'apple-touch-icon.png')
)

console.log('Icons gerados em public/icons/')
