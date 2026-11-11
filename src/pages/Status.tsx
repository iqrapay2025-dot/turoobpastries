import { useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Button, Field, Notice, Tracker } from '../components/ui'
import { stepsFor } from './Confirmation'
import { naira } from '../data'
import { trackOrder } from '../lib/supabase'
import { stageIndex, prettyDate, messageOf, type OrderView } from '../lib/orderView'
import QrCode from '../components/QrCode'
import { scanUrl } from '../lib/scan'
import ReorderButton from '../components/ReorderButton'

// Shape returned by the track_order database function.
type TrackView = {
  order_number: string
  order_status: OrderView['order_status']
  payment_status: OrderView['payment_status']
  fee_status: OrderView['fee_status']
  fulfilment: 'pickup' | 'delivery'
  batch_date: string
  batch_label: string | null
  delivery_slot: string | null
  total: number
  delivery_fee: number
  items: Array<{ name: string; quantity: number; line_total: number }>
}

export default function Status() {
  const { go, toast, order } = useApp()
  // Pre-fill from the last order placed on this device.
  const [code, setCode] = useState(order?.track_code ?? '')
  const [phone, setPhone] = useState(order?.phone ?? '')
  const [res, setRes] = useState<TrackView | 'none' | null>(null)
  const [loading, setLoading] = useState(false)

  const find = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.replace(/\D/g, '').length < 10) {
      toast('error', 'Enter the phone number you used for the order.')
      return
    }
    setLoading(true)
    setRes(null)
    try {
      const data = (await trackOrder(code.trim(), phone.trim())) as TrackView | null
      setRes(data ?? 'none')
    } catch (err) {
      toast('error', messageOf(err))
      setRes('none')
    } finally {
      setLoading(false)
    }
  }

  const r = res && res !== 'none' ? res : null
  const cancelled = r?.order_status === 'cancelled'
  const paid = r?.payment_status === 'paid'
  const step = r ? stageIndex(r.order_status) : 0
  // The secret order link is only known on the device that placed the order.
  const token = r && order && order.number === r.order_number ? (order.public_token as string | undefined) : undefined

  // What the customer should do next, if anything.
  let next: { title: string; text: string } | null = null
  if (r && !cancelled && !paid) {
    if (r.fulfilment === 'delivery' && r.fee_status === 'pending_review') {
      next = { title: 'We’re confirming your delivery fee', text: 'We’ll email you a link to accept the fee and pay. Check your inbox (and spam folder).' }
    } else if (r.fulfilment === 'delivery' && r.fee_status === 'confirmed') {
      next = { title: `Your delivery fee is ${naira(r.delivery_fee)}`, text: 'Use the link we emailed you to accept it and pay.' }
    } else {
      next = { title: 'Payment not completed yet', text: 'Your order is saved but not paid. Pay to confirm it.' }
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-4xl font-semibold sm:text-5xl">Track your order</h1>
      <p className="mt-2 text-ink-soft">Enter your tracking code and phone number. The code is on your confirmation page and in your email.</p>
      <form onSubmit={find} className="mt-6 space-y-4 rounded-[28px] bg-white p-6 shadow-soft">
        <Field label="Tracking code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. 7F3K9Q2M1X" autoCapitalize="characters" autoComplete="off" required />
        <Field label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0801 234 5678" required />
        <Button full size="lg" type="submit" loading={loading}><Search className="size-4" />Check status</Button>
        <p className="text-center text-xs text-ink/70">Use the phone number you gave when ordering.</p>
      </form>

      {res === 'none' && (
        <div className="mt-5">
          <Notice tone="error" title="We could not find that order">Check your tracking code and phone number, then try again. Still stuck? Message us on WhatsApp.</Notice>
        </div>
      )}

      {r && (
        <section className="pop-in mt-5 rounded-[28px] bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red">Order</p>
              <p className="font-display text-2xl font-semibold">{r.order_number}</p>
              <p className="text-sm text-ink/70">
                {r.items.reduce((a, i) => a + i.quantity, 0)} items · {naira(r.total)}
              </p>
              <p className="mt-1 text-sm text-ink/70">
                {r.batch_label ? `${r.batch_label}, ` : ''}{prettyDate(r.batch_date)}
                {r.fulfilment === 'delivery' && r.delivery_slot ? ` · ${r.delivery_slot}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {paid ? <Badge tone="paid">Paid</Badge>
                : r.payment_status === 'failed' ? <Badge tone="closed">Payment failed</Badge>
                  : r.payment_status === 'refunded' ? <Badge tone="closed">Refunded</Badge>
                    : <Badge tone="soon">Awaiting payment</Badge>}
              {cancelled
                ? <Badge tone="closed">Cancelled</Badge>
                : <Badge tone="preparing">{stepsFor(r.fulfilment)[step]}</Badge>}
            </div>
          </div>

          <ul className="mb-5 space-y-1 text-sm text-ink-soft">
            {r.items.map((i) => (
              <li key={i.name} className="flex justify-between gap-3"><span>{i.name} × {i.quantity}</span><span>{naira(i.line_total)}</span></li>
            ))}
          </ul>

          <div className="mb-5"><ReorderButton lines={r.items} /></div>

          {cancelled ? (
            <Notice title="This order was cancelled">{r.payment_status === 'refunded' ? 'Your payment has been refunded. ' : paid ? 'We will refund your payment. ' : ''}You can place a new order any time.</Notice>
          ) : (
            <Tracker steps={stepsFor(r.fulfilment)} current={step} />
          )}

          {!cancelled && r.order_status !== 'completed' && (
            <div className="mt-5 rounded-2xl bg-cream p-5 text-center">
              <p className="text-sm font-semibold">Show this code when you collect or receive your order</p>
              <QrCode value={scanUrl(r.order_number)} label={`QR code for order ${r.order_number}`} className="mx-auto mt-3 size-40 rounded-xl border border-ink/10" />
            </div>
          )}

          {r.order_status === 'ready_for_pickup' && (
            <div className="mt-5"><Notice title="Your order is ready for pickup">Come and collect it and show your order number <b>{r.order_number}</b>.</Notice></div>
          )}

          {next && (
            <div className="mt-5 space-y-3">
              <Notice title={next.title}>{next.text}</Notice>
              {token && (r.fulfilment === 'pickup' || r.fee_status === 'accepted') && (
                <Button full size="lg" onClick={() => go(`#/confirmation?token=${token}`)}>Pay now</Button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}