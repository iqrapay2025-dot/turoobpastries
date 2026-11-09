import { useState } from 'react'
import { Store, Bike, ChevronLeft, ShoppingBag } from 'lucide-react'
import { useApp, type Fulfilment } from '../store'
import { Button, EmptyState, Field, Notice, cx } from '../components/ui'
import { Lines, Totals } from '../components/Summary'
import { placeOrder, notify, paystackInit } from '../lib/supabase'
import { naira } from '../data'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-soft sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 text-xl font-semibold"><span className="grid size-8 place-items-center rounded-full bg-red font-display text-sm text-white">{n}</span>{title}</h2>{children}
    </section>
  )
}

const messageOf = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === 'object' && e && 'message' in e
      ? String((e as { message: unknown }).message)
      : 'Order placement failed. Please try again.'

export default function Checkout() {
    const {
    cart, subtotal, go, setOrder, clear, toast, closed, order, batch,
    products, productsLoading, productsError, settings, slots, currentBatch,
  } = useApp()

  // Pre-fill contact details from the customer's last order on this device.
  const [f, setF] = useState({ name: order?.name ?? '', phone: order?.phone ?? '', email: order?.email ?? '', address: '', landmark: '', notes: '' })
  const [mode, setMode] = useState<Fulfilment>('pickup')
  const [zone, setZone] = useState<'on' | 'off'>('on')
  const [slot, setSlot] = useState('')
  const [touched, setTouched] = useState(false)
  const [seen, setSeen] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const blur = (k: string) => () => setSeen((x) => ({ ...x, [k]: true }))

  if (productsLoading) return <main className="mx-auto max-w-lg px-4 py-16 text-center text-ink-soft">Loading your order…</main>
  if (productsError) return <main className="mx-auto max-w-lg px-4 py-16"><EmptyState icon={<ShoppingBag className="size-7" />} title="Couldn’t load the menu" action={<Button onClick={() => window.location.reload()}>Refresh</Button>}>Please refresh the page and try again.</EmptyState></main>

  const items = products
    .filter((p) => cart[p.id])
    .map((p) => ({ id: p.id as string, name: p.name as string, qty: cart[p.id], price: Number(p.price) }))

  if (items.length === 0) return <main className="mx-auto max-w-lg px-4 py-16"><EmptyState icon={<ShoppingBag className="size-7" />} title="Your cart is empty" action={<Button onClick={() => go('#/order')}>Browse the menu</Button>}>Add puff-puff to your order before checking out.</EmptyState></main>
  if (closed || !currentBatch) return <main className="mx-auto max-w-lg px-4 py-16"><EmptyState icon={<Store className="size-7" />} title="Orders closed for this batch" action={<Button variant="secondary" onClick={() => go('#/order')}>Pick another day</Button>}>Ordering is closed for this batch. Pick another day on the menu page.</EmptyState></main>

  const dayName = currentBatch.label
  const onFee = Number(settings?.on_campus_fee ?? 100)
  const offFee = Number(settings?.off_campus_fee ?? 200)
  const pickupPlace = settings?.pickup_location ?? 'Central Mosque, University of Ilorin'
  const fee = mode === 'delivery' ? (zone === 'on' ? onFee : offFee) : 0

  // Time slots for the selected batch day only.
  const daySlots: string[] = slots
    .filter((s) => s.batch_day_id === currentBatch.batch_day_id)
    .map((s) => s.label)
  const chosenSlot = daySlots.includes(slot) ? slot : (daySlots[0] ?? '')

  const err = {
    name: f.name.trim().length < 2 ? 'Please enter your full name' : '',
    phone: !/^(?:\+?234|0)[789][01]\d{8}$/.test(f.phone.replace(/[\s-]/g, '')) ? 'Enter a valid Nigerian number, e.g. 0803 123 4567 or +234 803 123 4567' : '',
    email: !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(f.email.trim()) ? 'Enter a valid email address' : '',
    address: mode === 'delivery' && f.address.trim().length < 3 ? 'Delivery address is required' : '',
  }
  const valid = !Object.values(err).some(Boolean)
  const show = (k: keyof typeof err) => (touched || seen[k] ? err[k] : '')

  const finish = (path: string) => {
    clear()
    go(path)
  }

  const submit = async () => {
    setTouched(true)
    if (!valid) {
      document.querySelector('[aria-invalid=true]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      // Prices are never sent: the server calculates the totals.
      const result = (await placeOrder({
        customer_name: f.name.trim(),
        customer_phone: f.phone.trim(),
        customer_email: f.email.trim(),
        batch_day_id: currentBatch.batch_day_id,
        fulfilment: mode,
        zone: mode === 'delivery' ? (zone === 'on' ? 'on_campus' : 'off_campus') : undefined,
        delivery_address: mode === 'delivery' ? f.address.trim() : undefined,
        landmark: mode === 'delivery' ? f.landmark.trim() || undefined : undefined,
        delivery_slot: mode === 'delivery' ? chosenSlot || undefined : undefined,
        notes: f.notes.trim() || undefined,
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
      })) as { order_number: string; public_token: string; track_code: string; total: number }

      setOrder({
        number: result.order_number,
        public_token: result.public_token,
        track_code: result.track_code,
        name: f.name.trim(),
        phone: f.phone.trim(),
        email: f.email.trim(),
        items,
        mode,
        zone,
        address: f.address.trim(),
        landmark: f.landmark.trim(),
        slot: chosenSlot,
        notes: f.notes.trim(),
        subtotal,
        fee,
        total: result.total,
        status: 0,
        feeConfirmed: false,
                batch,
      })

      // Confirmation email. A failure here must not block the order.
      try {
        await notify({ type: 'order_received', public_token: result.public_token })
      } catch (e) {
        console.error('Order email failed:', e)
      }

      if (mode === 'pickup') {
        try {
          const pay = await paystackInit({ public_token: result.public_token })
          if (!pay?.authorization_url) throw new Error('No payment link returned')
          clear()
          try { localStorage.removeItem('turoob_cart') } catch { /* storage unavailable */ }
          window.location.href = pay.authorization_url
          return
        } catch (e) {
          console.error('Payment start failed:', e)
          toast('error', 'Your order was saved, but we could not start the payment. You can pay from your order page.')
          finish(`#/confirmation?token=${result.public_token}`)
          return
        }
      }

      // Delivery: the team confirms the fee first, then the customer pays.
      finish(`#/fee?token=${result.public_token}`)
    } catch (e) {
      console.error('Order placement failed:', e)
      toast('error', messageOf(e))
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <button onClick={() => go('#/order')} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-red"><ChevronLeft className="size-4" />Back to menu</button>
      <h1 className="mb-6 text-4xl font-semibold sm:text-5xl">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Section n={1} title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Full name" value={f.name} onChange={set('name')} error={show('name')} valid={!err.name && !!f.name} onBlur={blur('name')} placeholder="e.g. Aisha Bello" autoComplete="name" /></div>
              <Field label="Phone number" type="tel" value={f.phone} onChange={set('phone')} error={show('phone')} valid={!err.phone && !!f.phone} onBlur={blur('phone')} inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" />
              <Field label="Email" type="email" value={f.email} onChange={set('email')} error={show('email')} valid={!err.email && !!f.email} onBlur={blur('email')} inputMode="email" placeholder="you@email.com" hint="We send your confirmation here" autoComplete="email" />
            </div>
          </Section>

          <Section n={2} title="Pickup or delivery">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-yellow-light/70 p-1" role="tablist">
              {([['pickup', Store, 'Pickup'], ['delivery', Bike, 'Delivery']] as const).map(([k, Icon, l]) => (
                <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={cx('flex h-12 items-center justify-center gap-2 rounded-full font-semibold transition', mode === k ? 'bg-red text-white shadow-pop' : 'text-ink-soft hover:bg-white/60')}><Icon className="size-5" />{l}</button>
              ))}
            </div>
            {mode === 'pickup' ? (
              <div className="pop-in mt-5 rounded-2xl bg-cream p-4">
                <p className="font-display text-lg font-semibold">{pickupPlace}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {currentBatch.serving_time_label
                    ? `Collect your ${dayName} order here (${currentBatch.serving_time_label}). Bring your order number.`
                    : `Collect your ${dayName} order here. We will confirm the exact pickup time with you. Bring your order number.`}
                </p>
              </div>
            ) : (
              <div className="pop-in mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                  {([['on', 'On-campus', onFee], ['off', 'Off-campus', offFee]] as const).map(([k, l, p]) => (
                    <button key={k} role="radio" aria-checked={zone === k} onClick={() => setZone(k)} className={cx('flex items-center justify-between rounded-2xl border-2 p-4 text-left transition', zone === k ? 'border-red bg-red-tint/50' : 'border-yellow-light hover:border-yellow')}>
                      <span className="flex items-center gap-3"><span className={cx('grid size-5 place-items-center rounded-full border-2', zone === k ? 'border-red' : 'border-ink/30')}>{zone === k && <span className="size-2.5 rounded-full bg-red" />}</span><b>{l}</b></span>
                      <span className="font-display text-lg font-semibold text-red">{naira(p)}</span>
                    </button>
                  ))}
                </div>
                <Field label="Delivery address or location" value={f.address} onChange={set('address')} error={show('address')} valid={!err.address && !!f.address} onBlur={blur('address')} placeholder="e.g. Hall 3, Room 214, Unilorin" />
                <Field label="Landmark" optional value={f.landmark} onChange={set('landmark')} placeholder="e.g. Opposite the faculty gate" />
                <div>
                  <p className="mb-2 text-sm font-semibold">Preferred time slot</p>
                  {daySlots.length > 0 ? (
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {daySlots.map((s) => <button key={s} role="radio" aria-checked={chosenSlot === s} onClick={() => setSlot(s)} className={cx('min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition', chosenSlot === s ? 'border-red bg-red text-white' : 'border-yellow bg-yellow-light/50 hover:bg-yellow')}>{s}</button>)}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">No fixed time slots for {dayName}. We will confirm a delivery time with you.</p>
                  )}
                </div>
                <Notice>Final delivery fee depends on your location. We'll confirm it with you before payment.</Notice>
              </div>
            )}
          </Section>

          <Section n={3} title="Order notes">
            <Field label="Anything we should know?" optional value={f.notes} onChange={set('notes')} placeholder="e.g. Extra pepper please" />
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] bg-white p-6 shadow-soft">
            <h2 className="mb-2 text-xl font-semibold">Order summary</h2>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red">{dayName} batch</p>
            <Lines items={items} />
            <div className="mt-3"><Totals subtotal={subtotal} fee={mode === 'delivery' ? { estimate: fee } : 'pickup'} /></div>
            <div className="mt-6">
              {mode === 'pickup' ? (
                <div className="space-y-3">
                  <Button full size="lg" loading={submitting} onClick={submit}>Checkout with Paystack</Button>
                  <p className="text-center text-sm font-medium text-ink-soft">Pay with card, bank transfer, USSD or OPay</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button full size="lg" loading={submitting} onClick={submit}>Place order</Button>
                  <p className="text-center text-sm text-ink-soft">Next, we confirm your final delivery fee and email you a link to accept it and pay with Paystack.</p>
                  <p className="text-center text-sm font-medium text-ink-soft">Pay with card, bank transfer, USSD or OPay</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}