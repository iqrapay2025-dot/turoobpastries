import { useCallback, useEffect, useState } from 'react'
import { Mail, MapPin, Clock, Lock } from 'lucide-react'
import { useApp } from '../store'
import { Button, Sparkle, Tracker, Notice } from '../components/ui'
import { Lines, Totals } from '../components/Summary'
import { WA, WhatsAppIcon } from '../components/Layout'
import { getOrderByToken, paystackInit } from '../lib/supabase'
import { tokenFromRoute, stageIndex, messageOf, prettyDate, type OrderView } from '../lib/orderView'
import LottieAnimation from '../components/LottieAnimation'
import Loader from '../components/Loader'
import QrCode from '../components/QrCode'
import { scanUrl } from '../lib/scan'
import ReorderButton from '../components/ReorderButton'

export const stepsFor = (m: 'pickup' | 'delivery') => ['Received', 'Preparing', m === 'delivery' ? 'Out for delivery' : 'Ready for pickup', 'Completed']

export function PuffIllustration() {
  return (
    <div className="relative mx-auto size-36">
      <Sparkle className="-left-2 top-2 size-6" /><Sparkle className="-right-2 top-10 size-5 [animation-delay:1s]" />
      <svg viewBox="0 0 120 120" className="size-full" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="#FFE9A0" />
        <circle cx="42" cy="72" r="22" fill="#FFC107" /><circle cx="78" cy="72" r="22" fill="#C79100" opacity=".9" /><circle cx="60" cy="46" r="24" fill="#FFC107" />
        <circle cx="52" cy="40" r="5" fill="#FFE9A0" opacity=".9" /><circle cx="35" cy="66" r="4" fill="#FFE9A0" opacity=".8" /><circle cx="71" cy="66" r="3" fill="#FFE9A0" />
        <circle cx="94" cy="24" r="14" fill="#D62828" /><path d="M87 24l5 5 9-10" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Plain({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children && <p className="mt-2 text-ink-soft">{children}</p>}
      {actions && <div className="mt-5 flex justify-center gap-3">{actions}</div>}
    </main>
  )
}

export default function Confirmation() {
  const { route, order, go, toast, settings } = useApp()
  const token = tokenFromRoute(route) ?? order?.public_token ?? null
  const [data, setData] = useState<OrderView | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [waited, setWaited] = useState(0)
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    if (!token) { setState('missing'); return }
    try {
      const d = (await getOrderByToken(token)) as OrderView | null
      if (!d) { setState('missing'); return }
      setData(d)
      setState('ready')
    } catch (e) {
      console.error('Could not load order:', e)
      setState('error')
    }
  }, [token])

  useEffect(() => { load() }, [load])

  // A delivery order that has not been through the fee step belongs on the fee page.
  const needsFeeStep = !!data && data.fulfilment === 'delivery' && ['pending_review', 'confirmed'].includes(data.fee_status)
  useEffect(() => {
    if (token && needsFeeStep) go(`#/fee?token=${token}`)
  }, [needsFeeStep, token, go])

  // The webhook marks the order paid a moment after Paystack returns the customer here.
  // Check every 3 seconds for up to 30 seconds.
  const cancelled = data?.order_status === 'cancelled'
  const waiting = !!data && data.payment_status !== 'paid' && !needsFeeStep && !cancelled
  useEffect(() => {
    if (!waiting || waited >= 30) return
    const t = setTimeout(() => { setWaited((w) => w + 3); load() }, 3000)
    return () => clearTimeout(t)
  }, [waiting, waited, load, data])

  const payNow = async () => {
    if (!token) return
    setPaying(true)
    try {
      const r = await paystackInit({ public_token: token })
      if (!r?.authorization_url) throw new Error('No payment link returned')
      window.location.href = r.authorization_url
    } catch (e) {
      toast('error', messageOf(e))
      setPaying(false)
    }
  }

  if (state === 'loading') return <main className="mx-auto max-w-lg px-4"><Loader page label="Loading your order…" /></main>
  if (state === 'error') return <Plain title="Couldn’t load your order" actions={<Button onClick={() => { setState('loading'); load() }}>Try again</Button>}>Please check your connection and try again.</Plain>
  if (state === 'missing' || !data) return <Plain title="No order found" actions={<><Button onClick={() => go('#/order')}>Order now</Button><Button variant="secondary" onClick={() => go('#/status')}>Track order</Button></>}>Use the link in your confirmation email, or look up an order with your order number.</Plain>
  if (needsFeeStep) return <Plain title="Opening your order…" />
  if (cancelled) return <Plain title="This order was cancelled" actions={<Button onClick={() => go('#/order')}>Start a new order</Button>}>Order {data.order_number} was cancelled. You can place a new order any time.</Plain>

  const paid = data.payment_status === 'paid'

  // Not paid yet: either the webhook is still catching up, or payment did not complete.
  if (!paid) {
    const stillChecking = waited < 30
    return (
      <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
        <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-9">
          <p className="text-sm font-bold uppercase tracking-wider text-red">Order {data.order_number}</p>
          {stillChecking ? (
            <>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Confirming your payment…</h1>
              <p className="mt-3 text-ink-soft">This only takes a moment. Please don’t close this page.</p>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">We haven’t received your payment yet</h1>
              <p className="mt-3 text-ink-soft">If you already paid, give it a minute and refresh this page. Otherwise you can pay now to confirm your order.</p>
            </>
          )}
          <div className="mt-6 rounded-2xl bg-cream p-5 text-left"><Lines items={data.items} /><div className="mt-3"><Totals subtotal={data.subtotal} fee={data.fulfilment === 'delivery' ? data.delivery_fee : 'pickup'} /></div></div>
          <div className="mt-6 space-y-3">
            <Button full size="lg" loading={paying} onClick={payNow}><Lock className="size-4" />Pay now</Button>
            <Button full variant="secondary" size="lg" onClick={() => { setWaited(0); load() }}>I’ve paid. Check again</Button>
          </div>
        </div>
      </main>
    )
  }

  const delivery = data.fulfilment === 'delivery'
  const pickupPlace = settings?.pickup_location ?? 'Central Mosque, University of Ilorin'
  const when = `${data.batch_label ?? ''} ${prettyDate(data.batch_date)}`.trim()

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-10">
        <LottieAnimation className="mx-auto size-40" />
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Order confirmed!</h1>
        <p className="mt-2 text-ink-soft">Thank you, {data.customer_name.split(' ')[0]}. Your puff-puff is on its way to the fryer.</p>
        <div className="mx-auto mt-6 inline-block rounded-2xl bg-yellow px-8 py-4"><p className="text-xs font-bold uppercase tracking-wider">Order number</p><p className="font-display text-3xl font-semibold tracking-wide">{data.order_number}</p></div>
        <div className="mx-auto mt-3 inline-block rounded-2xl bg-cream px-6 py-3"><p className="text-xs font-bold uppercase tracking-wider">Tracking code</p><p className="font-display text-2xl font-semibold tracking-widest">{data.track_code}</p>{data.customer_code && <p className="mt-3 text-xs font-bold uppercase tracking-wider">Customer ID <span className="font-display text-base tracking-widest">{data.customer_code}</span></p>}<p className="mt-1 max-w-xs text-xs text-ink/70">Keep this private. You need it, plus your phone number, to track your order.{data.fulfilment === 'pickup' ? ' For pickup, show your order number.' : ''}</p></div>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-yellow-light/70 px-4 py-2 text-sm font-medium"><Mail className="size-4 text-red" />A confirmation email has been sent to {data.customer_email}</p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-[28px] bg-white p-6 shadow-soft">
          <h2 className="mb-3 text-xl font-semibold">Order summary</h2>
          <Lines items={data.items} /><div className="mt-3"><Totals subtotal={data.subtotal} fee={delivery ? data.delivery_fee : 'pickup'} /></div>
        </section>
        <section className="rounded-[28px] bg-white p-6 shadow-soft">
          <h2 className="mb-3 text-xl font-semibold">{delivery ? 'Delivery details' : 'Pickup details'}</h2>
          <div className="space-y-4 text-sm">
            <p className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-red" /><span>{delivery ? <>{data.delivery_address}{data.landmark && <span className="block text-ink/70">Near {data.landmark}</span>}</> : <>{pickupPlace}{data.serving_time_label && <span className="block text-ink/70">{data.serving_time_label}</span>}</>}</span></p>
            <p className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-red" /><span>{delivery ? `${when}${data.delivery_slot ? `, time slot ${data.delivery_slot}` : ', we will confirm your delivery time'}` : `${when}${data.pickup_slot ? `, pickup ${data.pickup_slot}` : ''}`}</span></p>
          </div>
        </section>
      </div>

      <div className="mt-5"><ReorderButton lines={data.items} /></div>

      <section className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-soft">
        <h2 className="text-xl font-semibold">Your order code</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
          {delivery ? 'Show this code to our rider when your order arrives so we can scan it.' : 'Show this code at pickup so we can scan it and hand over your order.'}
        </p>
        <QrCode value={scanUrl(data.order_number)} label={`QR code for order ${data.order_number}`} className="mx-auto mt-4 size-48 rounded-2xl border border-ink/10" />
        <p className="mt-2 font-display text-lg font-semibold tracking-wide">{data.order_number}</p>
        <p className="mt-1 text-xs text-ink/70">Tip: take a screenshot so you have it even without data.</p>
      </section>

      <section className="mt-5 rounded-[28px] bg-white p-6 shadow-soft">
        <h2 className="mb-5 text-xl font-semibold">Order status</h2>
        <Tracker steps={stepsFor(data.fulfilment)} current={stageIndex(data.order_status)} />
      </section>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={() => go('#/status')}>Track my order</Button>
        <a href={WA} target="_blank" rel="noreferrer"><Button size="lg" variant="dark" full><WhatsAppIcon className="size-5" />Chat with us on WhatsApp</Button></a>
        <Button size="lg" variant="secondary" onClick={() => go('#/')}>Back home</Button>
      </div>
    </main>
  )
}