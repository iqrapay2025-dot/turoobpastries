import { useState } from 'react'
import { Store, Bike, Info, ChevronLeft, ShoppingBag } from 'lucide-react'
import { useApp, type Order, type Fulfilment } from '../store'
import { BATCHES } from '../data'
import { Button, EmptyState, Field, Notice, cx } from '../components/ui'
import { Lines, Totals } from '../components/Summary'
import { placeOrder, notify as supabaseNotify, paystackInit } from '../lib/supabase'
import { LINES, SLOTS, naira } from '../data'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-soft sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 text-xl font-semibold"><span className="grid size-8 place-items-center rounded-full bg-red font-display text-sm text-white">{n}</span>{title}</h2>{children}
    </section>
  )
}

export default function Checkout() {
  const { cart, subtotal, go, setOrder, closed, order, batch } = useApp()
  const prev = order && !order.feeConfirmed ? order : null
  const [f, setF] = useState({ name: prev?.name ?? '', phone: prev?.phone ?? '', email: prev?.email ?? '', address: '', landmark: '', notes: prev?.notes ?? '' })
  const [mode, setMode] = useState<Fulfilment>('pickup')
  const [zone, setZone] = useState<'on' | 'off'>('on')
  const [slot, setSlot] = useState(SLOTS[1])
  const [touched, setTouched] = useState(false)
  const [seen, setSeen] = useState<Record<string, boolean>>({})
  const blur = (k: string) => () => setSeen((x) => ({ ...x, [k]: true }))
  const items = LINES.filter((p) => cart[p.id]).map((p) => ({ id: p.id, name: p.name, qty: cart[p.id], price: p.price }))

  if (items.length === 0) return <main className="mx-auto max-w-lg px-4 py-16"><EmptyState icon={<ShoppingBag className="size-7" />} title="Your cart is empty" action={<Button onClick={() => go('#/order')}>Browse the menu</Button>}>Add puff-puff to your order before checking out.</EmptyState></main>
  if (closed) return <main className="mx-auto max-w-lg px-4 py-16"><EmptyState icon={<Store className="size-7" />} title="Orders closed for this batch" action={<Button variant="secondary" onClick={() => go('#/')}>Back home</Button>}>The 7am cutoff has passed. Pick another day on the menu page.</EmptyState></main>

  const fee = mode === 'delivery' ? (zone === 'on' ? 100 : 200) : 0
  const err = {
    name: f.name.trim().length < 2 ? 'Please enter your full name' : '',
    phone: !/^(?:\+?234|0)[789][01]\d{8}$/.test(f.phone.replace(/[\s-]/g, '')) ? 'Enter a valid Nigerian number, e.g. 0803 123 4567 or +234 803 123 4567' : '',
    email: !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(f.email.trim()) ? 'Enter a valid email address' : '',
    address: mode === 'delivery' && f.address.trim().length < 3 ? 'Delivery address is required' : '',
  }
  const valid = !Object.values(err).some(Boolean)
  const show = (k: keyof typeof err) => (touched || seen[k] ? err[k] : '')
  const build = async (): Promise<Order | null> => {
    setTouched(true)
    if (!valid) { document.querySelector('[aria-invalid=true]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return null }
    const o: Order = { number: 'TRB-' + Math.floor(1100 + Math.random() * 8800), ...f, items, mode, zone, slot, subtotal, fee, total: subtotal + fee, status: 0, feeConfirmed: mode === 'pickup', batch }
    try {
      const result = await placeOrder(o)
      if (result) {
        // Invoke notify function
        await supabaseNotify({ type: 'order_received', public_token: result.public_token })
        // For pickup orders, init Paystack
        if (mode === 'pickup') {
          const paystackResult = await paystackInit({ public_token: result.public_token })
          if (paystackResult?.authorization_url) {
            window.location.href = paystackResult.authorization_url
          } else {
            throw new Error('Payment initialization failed')
          }
        } else {
          // Delivery orders: go to fee confirmation screen
          go('#/fee')
        }
      }
    } catch (e: any) {
      console.error('Order placement failed:', e)
      // Use toast from useApp
      const { toast } = useApp()
      toast('error', e.message || 'Order placement failed. Please try again.')
      return null
    }
    return o
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
                <p className="font-display text-lg font-semibold">Central Mosque, University of Ilorin</p>
                <p className="mt-1 text-sm text-ink-soft">{batch === 'fri' ? 'Collect your order after Jumah prayer, from about 2:30pm. Bring your order number.' : `Collect your ${BATCHES.find((b) => b.id === batch)!.day} order here. We will confirm the exact pickup time with you. Bring your order number.`}</p>
              </div>
            ) : (
              <div className="pop-in mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                  {([['on', 'On-campus', 100], ['off', 'Off-campus', 200]] as const).map(([k, l, p]) => (
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
                  <div className="flex flex-wrap gap-2" role="radiogroup">
                    {SLOTS.map((s) => <button key={s} role="radio" aria-checked={slot === s} onClick={() => setSlot(s)} className={cx('min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition', slot === s ? 'border-red bg-red text-white' : 'border-yellow bg-yellow-light/50 hover:bg-yellow')}>{s}</button>)}
                  </div>
                </div>
                <Notice><span className="flex items-start gap-2"><Info className="hidden" /></span>Final delivery fee depends on your location. We'll confirm it with you before payment.</Notice>
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
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red">{BATCHES.find((b) => b.id === batch)!.day} batch</p>
            <Lines items={items} />
            <div className="mt-3"><Totals subtotal={subtotal} fee={mode === 'delivery' ? fee : null} pending={mode === 'delivery'} /></div>
            <div className="mt-6">
              {mode === 'pickup' ? (
                <Button full size="lg" onClick={async () => { await build() }}>Checkout with Paystack</Button>
              ) : (
                <div className="space-y-3">
                  <Button full size="lg" onClick={async () => { await build() }}>Confirm delivery fee</Button>
                  <p className="text-center text-sm text-ink-soft">Next, you will see your final fee, then pay with Paystack.</p>
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
