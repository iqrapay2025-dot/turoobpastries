import { useMemo } from 'react'
import { qrMatrix } from '../lib/qr'

const QUIET = 4 // blank border around the code, in modules (the QR standard asks for 4)

// Draws a QR code as a crisp SVG. Always black on white so every scanner can read it.
export default function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const m = qrMatrix(value)
    const n = m.length
    let d = ''
    m.forEach((row, y) => {
      let x = 0
      while (x < n) {
        if (row[x]) {
          const start = x
          while (x < n && row[x]) x++
          d += `M${start + QUIET} ${y + QUIET}h${x - start}v1h-${x - start}z`
        } else x++
      }
    })
    return { path: d, size: n + QUIET * 2 }
  }, [value])

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#111111" />
    </svg>
  )
}