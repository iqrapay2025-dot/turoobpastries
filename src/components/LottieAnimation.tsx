import { useEffect, useState } from 'react'
import { Lottie } from 'lottie-react'

const ANIMATION_URL =
  'https://lottie.host/c09c57c4-8ab6-41f1-aadf-b7fc86778ce4/ugxcGKzIAS.json'

// Turoob brand colours
const YELLOW = '#FFC107'
const RED = '#D62828'
const INK = '#111111'

// Which brand colour each part of the animation gets.
// Keys are the layer names inside the Lottie file.
const LAYER_COLORS: Record<string, string> = {
  '背景色': YELLOW, // background circle
  '扩散': RED, // expanding ripple
}
const STROKE_COLOR = INK // the ring (its layer sits inside a precomp)

const hexToLottie = (hex: string): number[] => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]
}

// Walks the animation JSON and swaps colours on fills (ty "fl") and strokes (ty "st").
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recolor(node: any, layerColor?: string): void {
  if (Array.isArray(node)) {
    node.forEach((n) => recolor(n, layerColor))
    return
  }
  if (!node || typeof node !== 'object') return

  const colour = LAYER_COLORS[node.nm] ?? layerColor

  if (node.ty === 'fl' && colour && Array.isArray(node.c?.k)) node.c.k = hexToLottie(colour)
  if (node.ty === 'st' && Array.isArray(node.c?.k)) node.c.k = hexToLottie(STROKE_COLOR)

  for (const key of Object.keys(node)) recolor(node[key], colour)
}

// Download and recolour once, then reuse for every loader on the site.
let cache: Promise<object> | null = null
const loadAnimation = () =>
  (cache ??= fetch(ANIMATION_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Animation request failed (${r.status})`)
      return r.json()
    })
    .then((json) => {
      recolor(json)
      return json as object
    })
    .catch((e) => {
      cache = null // allow a retry next time
      throw e
    }))

type Props = {
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export default function LottieAnimation({ className, loop = true, autoplay = true }: Props) {
  const [data, setData] = useState<object | null>(null)

  useEffect(() => {
    let alive = true
    loadAnimation()
      .then((json) => {
        if (alive) setData(json)
      })
      .catch((e) => console.error('Could not load animation:', e))
    return () => {
      alive = false
    }
  }, [])

  // Keeps the space reserved while the animation downloads.
  if (!data) return <div className={className} aria-hidden />

  return <Lottie src={data} loop={loop} autoplay={autoplay} className={className} aria-hidden />
}