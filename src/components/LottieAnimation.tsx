import { useEffect, useMemo, useRef, useState } from 'react'
import { Lottie, type LottieHandle } from 'lottie-react'
import { Loader2 } from 'lucide-react'
// Saved copy of https://lottie.host/c09c57c4-8ab6-41f1-aadf-b7fc86778ce4/ugxcGKzIAS.json
// Save that file as src/assets/loader.json so the loader works offline.
import loaderJson from '../assets/loader.json'

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

// Recolour once, then reuse for every loader on the site.
let animation: object | null = null
function getAnimation(): object {
  if (!animation) {
    const copy = structuredClone(loaderJson) as object
    recolor(copy)
    animation = copy
  }
  return animation
}

type Props = {
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export default function LottieAnimation({ className, loop = true, autoplay = true }: Props) {
  const [data, setData] = useState<object | null>(null)
  const [failed, setFailed] = useState(false)
  const handle = useRef<LottieHandle>(null)

  // lottie-react skips autoplay when the device has "reduce motion" switched on, which leaves the
  // loader frozen on its first frame. A loading indicator is essential feedback, so start it anyway.
  const subscriptions = useMemo(
    () => ({ ready: () => { if (autoplay) handle.current?.play() } }),
    [autoplay],
  )

  useEffect(() => {
    try {
      setData(getAnimation())
    } catch (e) {
      console.error('Could not prepare animation:', e)
      setFailed(true)
    }
  }, [])

  // Plain spinner if the animation can't be prepared.
  if (failed) {
    return (
      <div className={className} aria-hidden>
        <Loader2 className="size-full animate-spin text-red" />
      </div>
    )
  }

  // Always show visible feedback while the animation is being prepared.
  if (!data)
    return (
      <div className={className} aria-hidden>
        <Loader2 className="size-full animate-spin text-red" />
      </div>
    )

  return <Lottie src={data} loop={loop} autoplay={autoplay} lottieRef={handle} subscriptions={subscriptions} className={className} aria-hidden />
}