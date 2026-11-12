import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CheckCircle2, Gift, MapPin, Phone, ScanLine, Store } from 'lucide-react'
import { Button, Notice, cx } from '../components/ui'
import { useApp } from '../store'
import { useAdmin } from './adminContext'
import { naira } from '../data'
import { orderNumberFromScan } from '../lib/scan'
import { Card } from './ui'

// BarcodeDetector is built into Chrome/Edge/Android browsers. Safari on iPhone does not have it,
// so there the team can scan with the normal Camera app (the QR opens this page) or type the number.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasDetector = () => typeof window !== 'undefined' && 'BarcodeDetector' in (window as any)

const fromRoute = (route: string): string | null =>
  orderNumberFromScan(new URLSearchParams(route.split('?')[1] ?? '').get('o') ?? '')

export default function Scan() {
  const { route, go, toast } = useApp()
  const { orders, setStage, markPaidManually, reload } = useAdmin()
  const [code, setCode] = useState<string | null>(() => fromRoute(route))
  const [typed, setTyped] = useState('')
  const [typedErr, setTypedErr] = useState('')
  const [scanning, setScanning] = useState(false)
  const [camErr, setCamErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloaded, setReloaded] = useState(false)
  const video = useRef<HTMLVideoElement>(null)

  // Opening a scanned link (or navigating to /admin/scan?o=...) loads that order.
  useEffect(() => {
    const c = fromRoute(route)
    if (c) setCode(c)
  }, [route])

  /* ---- in-page camera scanner ---- */
  useEffect(() => {
    if (!scanning) return
    let stopped = false
    let stream: MediaStream | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
        const v = video.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        const tick = async () => {
          if (stopped) return
          try {
            const found = await detector.detect(v)
            const n = found.length ? orderNumberFromScan(String(found[0].rawValue)) : null
            if (n) { setCode(n); setScanning(false); return }
          } catch {
            /* nothing readable in this frame, keep trying */
          }
          timer = setTimeout(tick, 200)
        }
        tick()
      } catch (e) {
        console.error('Camera error:', e)
        setCamErr('Could not open the camera. Allow camera access in your browser, or type the order number below.')
        setScanning(false)
      }
    }
    run()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [scanning])

  const order = code ? orders.find((o) => o.no.toUpperCase() === code) : undefined

  const lookup = (e: React.FormEvent) => {
    e.preventDefault()
    const n = orderNumberFromScan(typed)
    if (!n) { setTypedErr('Enter an order number like TRB-1042'); return }
    setTypedErr('')
    setReloaded(false)
    setCode(n)
    setTyped('')
  }

  const startOver = () => {
    setCode(null)
    setReloaded(false)
    go('#/admin/scan')
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  /* ---- what the result card says ---- */
  let banner: { tone: 'ok' | 'warn' | 'bad'; title: string; text: string } | null = null
  if (order) {
    if (order.stage === 'cancelled') banner = { tone: 'bad', title: 'Cancelled order', text: 'Do not hand this order over.' }
    else if (order.stage === 'completed') banner = { tone: 'warn', title: 'Already completed', text: 'This order was already collected or delivered. Check before handing over anything.' }
    else if (!order.paid) banner = { tone: 'warn', title: 'Not paid yet', text: 'Take payment first, or ask the customer to pay on their order page.' }
    else banner = { tone: 'ok', title: 'Paid. OK to hand over', text: order.mode === 'delivery' ? 'Confirm the name, then mark it delivered.' : 'Confirm the name, then mark it collected.' }
  }
  const canComplete = !!order && order.paid && order.stage !== 'cancelled' && order.stage !== 'completed'
  const delivery = order?.mode === 'delivery'

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Scan an order</h1>
        <p className="mt-1 text-ink-soft">Scan the customer’s QR code to see their order and mark it collected or delivered.</p>
      </div>

      {!code && (
        <Card className="space-y-4 p-5">
          {scanning ? (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-ink">
                <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-4 border-yellow/80" />
              </div>
              <p className="text-center text-sm text-ink-soft">Point the camera at the QR code.</p>
              <Button full variant="secondary" onClick={() => setScanning(false)}><CameraOff className="size-4" />Stop camera</Button>
            </>
          ) : hasDetector() ? (
            <Button full size="lg" onClick={() => { setCamErr(''); setScanning(true) }}><Camera className="size-5" />Scan with camera</Button>
          ) : (
            <Notice title="Scan with your phone’s Camera app">
              This browser can’t scan inside the page. Open your phone’s normal Camera app and point it at the QR code. It opens this page with the order ready. Or type the order number below.
            </Notice>
          )}
          {camErr && <Notice tone="error">{camErr}</Notice>}

          <form onSubmit={lookup} className="border-t border-ink/10 pt-4">
            <label className="block text-sm font-semibold" htmlFor="scan-no">Or type the order number</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="scan-no"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="TRB-1042"
                autoCapitalize="characters"
                autoComplete="off"
                aria-invalid={!!typedErr}
                className={cx('h-12 min-w-0 flex-1 rounded-2xl border-2 bg-white px-4 text-lg font-semibold uppercase outline-none focus:border-yellow-dark focus:ring-4 focus:ring-yellow/30', typedErr ? 'border-red' : 'border-yellow-light')}
              />
              <Button type="submit" size="lg"><ScanLine className="size-4" />Find</Button>
            </div>
            {typedErr && <p className="mt-1 text-sm font-medium text-red">{typedErr}</p>}
          </form>
        </Card>
      )}

      {code && !order && (
        <Card className="space-y-3 p-5 text-center">
          <p className="font-display text-2xl font-semibold">{code}</p>
          <Notice tone="error" title="Order not found">
            {reloaded ? 'No order has this number. Check the code and try again.' : 'It may not have loaded yet. Refresh the orders and check again.'}
          </Notice>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!reloaded && <Button full variant="secondary" loading={busy} onClick={() => run(async () => { await reload(); setReloaded(true) })}>Refresh orders</Button>}
            <Button full onClick={startOver}>Scan another</Button>
          </div>
        </Card>
      )}

      {order && banner && (
        <Card className="overflow-hidden">
          <div className={cx('p-5', banner.tone === 'ok' && 'bg-ink text-yellow', banner.tone === 'warn' && 'bg-yellow-light text-red-dark', banner.tone === 'bad' && 'bg-red text-white')}>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">{order.no}</p>
            <p className="font-display text-2xl font-semibold">{banner.title}</p>
            <p className="mt-1 text-sm">{banner.text}</p>
          </div>

          <div className="space-y-4 p-5">
                        {(order.bonusPuffs ?? 0) > 0 && (
              <div className="rounded-2xl border-2 border-red bg-red-tint/60 p-3 text-sm">
                <p className="font-bold">🎉 Won the game: add {order.bonusPuffs} FREE puff-puff</p>
                <p className="mt-1 text-xs text-ink/70">Put one extra puff-puff in this order before handing it over.</p>
              </div>
            )}
            {order.isGift && (
              <div className="rounded-2xl border-2 border-yellow bg-yellow-light/50 p-3 text-sm">
                <p className="flex items-center gap-2 font-bold"><Gift className="size-4 text-red" />Gift for {order.recipientName}</p>
                {order.recipientPhone && <p className="mt-1"><a href={`tel:${order.recipientPhone}`} className="hover:underline">{order.recipientPhone}</a></p>}
                {order.giftMessage && <p className="mt-1">“{order.giftMessage}”</p>}
                <p className="mt-1 text-xs text-ink/70">Hand this to the recipient. The buyer is {order.name}.</p>
              </div>
            )}

            <div>
              <p className="text-lg font-semibold">{order.isGift ? `Buyer: ${order.name}` : order.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm"><Phone className="size-4 text-red" /><a href={`tel:${order.phone}`} className="hover:underline">{order.phone}</a></p>
              <p className="mt-1 flex items-start gap-2 text-sm">
                {delivery ? <MapPin className="mt-0.5 size-4 shrink-0 text-red" /> : <Store className="mt-0.5 size-4 shrink-0 text-red" />}
                <span>{delivery ? order.address : 'Pickup'}{order.slot ? ` · ${order.slot}` : ''}</span>
              </p>
            </div>

            <ul className="divide-y divide-ink/10 text-sm">
              {order.pepper > 0 && <li className="flex justify-between py-2"><span>{order.pepper}× Puff-Puff (With Pepper)</span></li>}
              {order.plain > 0 && <li className="flex justify-between py-2"><span>{order.plain}× Puff-Puff (Without Pepper)</span></li>}
              {order.zobo > 0 && <li className="flex justify-between py-2"><span>{order.zobo}× Zobo</span></li>}
              <li className="flex justify-between py-2 font-semibold"><span>Total</span><span>{naira(order.dbTotal ?? 0)}</span></li>
            </ul>
            {order.notes && <p className="rounded-2xl bg-yellow-light/60 p-3 text-sm"><b>Note:</b> {order.notes}</p>}

            <div className="space-y-2">
              {!order.paid && order.stage !== 'cancelled' && order.stage !== 'completed' && (
                <Button full variant="secondary" disabled={busy} onClick={() => {
                  if (window.confirm(`Mark ${order.no} as paid? Only do this if you have received the money outside Paystack.`)) run(() => markPaidManually(order.no))
                }}><CheckCircle2 className="size-4" />Mark as paid manually</Button>
              )}
              {canComplete && (
                <Button full size="lg" loading={busy} disabled={busy} onClick={() => run(async () => {
                  await setStage(order.no, 'completed')
                  toast('success', `${order.no} marked ${delivery ? 'delivered' : 'collected'}`)
                })}><CheckCircle2 className="size-5" />{delivery ? 'Mark delivered' : 'Mark collected'}</Button>
              )}
              <Button full variant={canComplete ? 'secondary' : 'primary'} onClick={startOver}><ScanLine className="size-4" />Scan another</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}