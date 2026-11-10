import { useEffect, useRef, useState } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'
import { Loader2 } from 'lucide-react'
import { cx } from './ui'
// Saved copy of https://lottie.host/c09c57c4-8ab6-41f1-aadf-b7fc86778ce4/ugxcGKzIAS.json
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

// Recolour once and keep the result. lottie-web edits the data it is given while loading,
// so every instance gets its own copy of this recoloured version.
let recoloured: object | null = null
function getAnimation(): object {
  if (!recoloured) {
    const copy = structuredClone(loaderJson) as object
    recolor(copy)
    recoloured = copy
  }
  return structuredClone(recoloured)
}

type Props = {
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export default function LottieAnimation({ className, loop = true, autoplay = true }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    let anim: AnimationItem | undefined
    try {
      anim = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: getAnimation(),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      anim.addEventListener('DOMLoaded', () => setReady(true))
      anim.addEventListener('data_failed', () => setFailed(true))
    } catch (e) {
      console.error('Could not start loader animation:', e)
      setFailed(true)
    }
    return () => anim?.destroy()
  }, [loop, autoplay])

  // Plain spinner if the animation can't run.
  if (failed) {
    return (
      <div className={className} aria-hidden>
        <Loader2 className="size-full animate-spin text-red" />
      </div>
    )
  }

  // The spinner stays visible until the animation has actually drawn, so there is never an empty gap.
  return (
    <div className={cx('relative', className)} aria-hidden>
      {!ready && <Loader2 className="absolute inset-0 size-full animate-spin text-red" />}
      <div ref={box} className="size-full" />
    </div>
  )
}