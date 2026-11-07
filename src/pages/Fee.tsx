import { useCallback, useEffect, useState } from 'react'
import { MapPin, Clock, Truck, Lock, Hourglass } from 'lucide-react'
import { useApp } from '../store'
import { Button } from '../components/ui'
import { Lines, Totals } from '../components/Summary'
import { getOrderByToken, respondToDeliveryFee, paystackInit } from '../lib/supabase'
import { tokenFromRoute, messageOf, type OrderView } from '../lib/orderView'
import { naira } from '../data'

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">{children}</main>
}

function Message({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Shell>
      <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-9">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {children && <p className="mt-3 text-ink-soft">{children}</p>}
        {actions && <div className="mt-6 flex flex-col gap-3">{actions}</div>}
      </div>
    </Shell>
  )
}

export default function Fee() {
  const { route, order, go, toast, setOrder } = useApp()
  const token = tokenFromRoute(route) ?? order?.public_token ?? null
  const [data, setData] = useState<OrderView | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [busy, setBusy] = useState<'' | 'accept' | 'decline' | 'pay'>('')

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

  // While the team is still working out the fee, check again every 15 seconds.
  useEffect(() => {
    if (data?.fee_status !== 'pending_review') return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [data?.fee_status, load])

  // Pickup orders never need a fee step.
  useEffect(() => {
    if (token && data?.fulfilment === 'pickup') go(`#/confirmation?token=${token}`)
  }, [data?.fulfilment, token, go])

  const startPayment = async () => {
    if (!token) return
    setBusy('pay')
    try {
      const r = await paystackInit({ public_token: token })
      if (!r?.authorization_url) throw new Error('No payment link returned')
      window.location.href = r.authorization_url
    } catch (e) {
      toast('error', messageOf(e))
      setBusy('')
      await load()
    }
  }

  const accept = async () => {
    if (!token) return
    setBusy('accept')
    try {
      await respondToDeliveryFee(token, true)
    } catch (e) {
      toast('error', messageOf(e))
      setBusy('')
      await load()
      return
    }
    await startPayment()
  }

  const decline = async () => {
    if (!token) return
    setBusy('decline')
    try {
      await respondToDeliveryFee(token, false)
      toast('info', 'Delivery fee declined and this order was cancelled.')
      setOrder(null)
      go('#/order')
    } catch (e) {
      toast('error', messageOf(e))
      setBusy('')
    }
  }

  if (state === 'loading') return <Shell><p className="text-center text-ink-soft">Loading your order…</p></Shell>
  if (state === 'error') return <Message title="Couldn’t load your order" actions={<Button onClick={() => { setState('loading'); load() }}>Try again</Button>}>Please check your connection and try again.</Message>
  if (state === 'missing' || !data) return <Message title="Order not found" actions={<Button onClick={() => go('#/order')}>Start an order</Button>}>This link may be incomplete. Use the link in your email, or look up your order with your order number.</Message>

  if (data.fulfilment === 'pickup') return <Shell><p className="text-center text-ink-soft">Opening your order…</p></Shell>

  if (data.payment_status === 'paid') {
    return <Message title="Already paid" actions={<Button onClick={() => go(`#/confirmation?token=${token}`)}>View my order</Button>}>Order {data.order_number} has been paid for. Thank you!</Message>
  }

  if (data.fee_status === 'declined' || data.order_status === 'cancelled') {
    return <Message title="This order was cancelled" actions={<Button onClick={() => go('#/order')}>Start a new order</Button>}>Order {data.order_number} was cancelled. You can place a new order any time.</Message>
  }

  if (data.fee_status === 'pending_review') {
    return (
      <Shell>
        <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-9">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-yellow text-ink"><Hourglass className="size-9" /></span>
          <p className="mt-5 text-sm font-bold uppercase tracking-wider text-red">Order {data.order_number}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">We’re confirming your delivery fee</h1>
          <p className="mt-3 text-ink-soft">We’ll work out the fee for {data.delivery_address} and email you at {data.customer_email} with a link to accept it and pay. This page also updates by itself.</p>
          <div className="mt-6 rounded-2xl bg-cream p-5 text-left"><Lines items={data.items} /><div className="mt-3"><Totals subtotal={data.subtotal} fee="tbc" /></div></div>
          <Button className="mt-6" full variant="secondary" size="lg" onClick={() => go('#/')}>Back home</Button>
        </div>
      </Shell>
    )
  }

  const accepted = data.fee_status === 'accepted'
  return (
    <Shell>
      <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-9">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-yellow text-ink"><Truck className="size-9" /></span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-red">{accepted ? 'Delivery fee accepted' : 'Delivery fee confirmed'}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">Your delivery fee is <span className="text-red">{naira(data.delivery_fee)}</span> for {data.delivery_address}</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-light px-4 py-2 font-semibold"><MapPin className="size-4 text-red" />{data.zone === 'off_campus' ? 'Off-campus' : 'On-campus'}</span>
          {data.delivery_slot && <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-light px-4 py-2 font-semibold"><Clock className="size-4 text-red" />{data.delivery_slot}</span>}
        </div>
        <div className="mt-7 rounded-2xl bg-cream p-5 text-left"><Lines items={data.items} /><div className="mt-3"><Totals subtotal={data.subtotal} fee={data.delivery_fee} /></div></div>
        <div className="mt-7 space-y-3">
          {accepted ? (
            <Button full size="lg" loading={busy === 'pay'} onClick={startPayment}><Lock className="size-4" />Pay now</Button>
          ) : (
            <>
              <Button full size="lg" loading={busy === 'accept' || busy === 'pay'} onClick={accept}><Lock className="size-4" />Accept and pay</Button>
              <Button full variant="secondary" size="lg" loading={busy === 'decline'} onClick={decline}>Decline and cancel this order</Button>
            </>
          )}
        </div>
        <p className="mt-4 text-sm text-ink-soft">Pay with card, bank transfer, USSD or OPay</p>
      </div>
    </Shell>
  )
}