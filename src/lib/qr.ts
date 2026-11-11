// Small QR code generator (no dependencies). Byte mode, error correction level M, versions 1-10.
// Enough for order links of up to ~210 characters. Based on the public QR Code specification (ISO/IEC 18004).

const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26] // level M, index = version
const NUM_BLOCKS = [0, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5] // level M, index = version
const MAX_VERSION = 10

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0

function rawDataModules(ver: number): number {
  let r = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2
    r -= (25 * n - 10) * n - 55
    if (ver >= 7) r -= 36
  }
  return r
}

const dataCodewords = (ver: number) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver]

/* ---- Reed-Solomon over GF(256) ---- */
function gfMul(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

function rsDivisor(degree: number): number[] {
  const result: number[] = []
  for (let i = 0; i < degree - 1; i++) result.push(0)
  result.push(1)
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    divisor.forEach((coef, i) => { result[i] ^= gfMul(coef, factor) })
  }
  return result
}

function utf8Bytes(text: string): number[] {
  const out: number[] = []
  for (const b of new TextEncoder().encode(text)) out.push(b)
  return out
}

function buildCodewords(bytes: number[], ver: number): number[] {
  const capBits = dataCodewords(ver) * 8
  const bits: number[] = []
  const push = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1) }
  push(0x4, 4) // byte mode
  push(bytes.length, ver <= 9 ? 8 : 16)
  bytes.forEach((b) => push(b, 8))
  push(0, Math.min(4, capBits - bits.length)) // terminator
  push(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) push(pad, 8)
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]
    data.push(v)
  }

  // split into blocks, add error correction, interleave
  const numBlocks = NUM_BLOCKS[ver]
  const eccLen = ECC_PER_BLOCK[ver]
  const raw = Math.floor(rawDataModules(ver) / 8)
  const numShort = numBlocks - (raw % numBlocks)
  const shortLen = Math.floor(raw / numBlocks)
  const div = rsDivisor(eccLen)
  const blocks: number[][] = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, div)
    if (i < numShort) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const result: number[] = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= numShort) result.push(block[i])
    })
  }
  return result
}

function alignmentPositions(ver: number, size: number): number[] {
  if (ver === 1) return []
  const n = Math.floor(ver / 7) + 2
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < n; pos -= step) result.splice(1, 0, pos)
  return result
}

function penalty(m: boolean[][]): number {
  const size = m.length
  let score = 0
  const lines: string[] = []
  for (let y = 0; y < size; y++) lines.push(m[y].map((v) => (v ? '1' : '0')).join(''))
  for (let x = 0; x < size; x++) lines.push(m.map((row) => (row[x] ? '1' : '0')).join(''))
  for (const line of lines) {
    // runs of 5 or more
    let run = 1
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++
      else { if (run >= 5) score += 3 + (run - 5); run = 1 }
    }
    // finder-like patterns
    for (const p of ['00001011101', '10111010000']) {
      for (let i = line.indexOf(p); i !== -1; i = line.indexOf(p, i + 1)) score += 40
    }
  }
  // 2x2 blocks
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = m[y][x]
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3
    }
  }
  // dark / light balance
  let dark = 0
  for (const row of m) for (const v of row) if (v) dark++
  const total = size * size
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
  return score
}

/** Returns the QR code as a grid of modules (true = dark). Throws if the text is too long. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = utf8Bytes(text)
  let ver = 1
  while (ver <= MAX_VERSION && 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 > dataCodewords(ver) * 8) ver++
  if (ver > MAX_VERSION) throw new Error('Text is too long for the QR code')

  const size = ver * 4 + 17
  const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))
  const isFn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))
  const setFn = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    modules[y][x] = dark
    isFn[y][x] = true
  }

  // timing patterns
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0) }
  // finder patterns (with separators)
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        setFn(cx + dx, cy + dy, dist !== 2 && dist !== 4)
      }
    }
  }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4)
  // alignment patterns
  const pos = alignmentPositions(ver, size)
  const n = pos.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }

  const drawFormat = (mask: number) => {
    const data = (0 << 3) | mask // level M = 0
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i))
    setFn(8, 7, bit(bits, 6)); setFn(8, 8, bit(bits, 7)); setFn(7, 8, bit(bits, 8))
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i))
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i))
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i))
    setFn(8, size - 8, true)
  }
  drawFormat(0) // reserve the area; real mask is written below

  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFn(a, b, bit(bits, i)); setFn(b, a, bit(bits, i))
    }
  }

  // place data bits in the zig-zag order
  const codewords = buildCodewords(bytes, ver)
  let k = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!isFn[y][x] && k < codewords.length * 8) {
          modules[y][x] = bit(codewords[k >>> 3], 7 - (k & 7))
          k++
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let invert: boolean
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break
          case 1: invert = y % 2 === 0; break
          case 2: invert = x % 3 === 0; break
          case 3: invert = (x + y) % 3 === 0; break
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
        }
        if (!isFn[y][x] && invert) modules[y][x] = !modules[y][x]
      }
    }
  }

  // try every mask, keep the one with the lowest penalty
  let best = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask)
    drawFormat(mask)
    const s = penalty(modules)
    if (s < bestScore) { best = mask; bestScore = s }
    applyMask(mask) // undo
  }
  applyMask(best)
  drawFormat(best)
  return modules
}