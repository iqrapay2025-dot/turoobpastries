import { useEffect, useState } from 'react'
import { LogOut, Mail, KeyRound, Receipt } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Button, Field, Notice, EmptyState } from '../components/ui'
import { stepsFor } from './Confirmation'
import { naira } from '../data'
import { supabase } from '../lib/supabase'
import { stageIndex, prettyDate, messageOf, type OrderView } from '../lib/orderView'

// Shape returned by the my-orders edge function ("list" action).
type MyOrder = {
  order_number: string
  track_code: string
  created_at: string
  batch_date: string
  fulfilment: 'pickup' | 'delivery'
  order_status: OrderView['order_status']
  payment_status: OrderView['payment_status']
  subtotal: number
  delivery_fee: number
  total: number
  order_items: Array<{ product_name: string; quantity: number; line_total: number }>
}
type Listing = {
  email: string
  total_spent: number
  paid_order_count: number
  order_count: number
  ongoing: MyOrder[]
  past: MyOrder[]
}

const TOKEN_KEY = 'turoob_orders_token'
const EMAIL_KEY = 'turoob_orders_email'

const saveSession = (token: string | null, email?: string) => {
  try {
    if (token) { sessionStorage.setItem(TOKEN_KEY, token); if (email) sessionStorage.setItem(EMAIL_KEY, email) }
    else { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(EMAIL_KEY) }
  } catch { /* storage unavailable */ }
}
const loadToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null } }

// Calls the edge function and returns the server's own message on errors.
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('my-orders', { body })
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any).context
    if (ctx && typeof ctx.json === 'function') {
      try { const j = await ctx.json(); if (j?.error) throw Object.assign(new Error(j.error), { status: ctx.status }) } catch (e) { if (e instanceof Error && 'status' in e) throw e }
    }
    throw error
  }
  return data as T
}

function OrderCard({ o }: { o: MyOrder }) {
  const cancelled = o.order_status === 'cancelled'
  const paid = o.payment_status === 'paid'
  const steps = stepsFor(o.fulfilment)
  return (
    <article className="rounded-[28px] bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-semibold">{o.order_number}</p>
          <p className="text-sm text-ink/70">{prettyDate(o.batch_date)} · {o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {paid ? <Badge tone="paid">Paid</Badge>
            : o.payment_status === 'refunded' ? <Badge tone="closed">Refunded</Badge>
              : o.payment_status === 'failed' ? <Badge tone="closed">Payment failed</Badge>
                : <Badge tone="soon">Not paid yet</Badge>}
          {cancelled ? <Badge tone="closed">Cancelled</Badge> : <Badge tone="preparing">{steps[stageIndex(o.order_status)]}</Badge>}
        </div>
      </div>
      <ul className="mt-4 space-y-1 text-sm text-ink-soft">
        {o.order_items.map((i, k) => (
          <li key={k} className="flex justify-between gap-3"><span>{i.product_name} × {i.quantity}</span><span>{naira(i.line_total)}</span></li>
        ))}
        {o.delivery_fee > 0 && <li className="flex justify-between gap-3"><span>Delivery fee</span><span>{naira(o.delivery_fee)}</span></li>}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-yellow-light pt-3">
        <span className="text-sm font-semibold">Total</span>
        <span className="font-display text-lg font-semibold">{naira(o.total)}</span>
      </div>
    </article>
  )
}

export default function MyOrders() {
  const { go, toast } = useApp()
  const [step, setStep] = useState<'email' | 'code' | 'list'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(() => !!loadToken())
  const [data, setData] = useState<Listing | null>(null)

  const load = async (token: string) => {
    const res = await call<Listing>({ action: 'list', token })
    setData(res)
    setStep('list')
  }

  // Resume a sign-in from earlier in this browser tab, if it is still valid.
  useEffect(() => {
    const t = loadToken()
    if (!t) return
    load(t).catch(() => saveSession(null)).finally(() => setBooting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await call({ action: 'request_code', email: email.trim() })
      setStep('code')
      setCode('')
    } catch (err) {
      toast('error', messageOf(err))
    } finally { setLoading(false) }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await call<{ token: string; email: string }>({ action: 'verify_code', email: email.trim(), code: code.trim() })
      saveSession(r.token, r.email)
      await load(r.token)
    } catch (err) {
      toast('error', messageOf(err))
    } finally { setLoading(false) }
  }

  const logout = async () => {
    const t = loadToken()
    saveSession(null)
    setData(null); setStep('email'); setCode('')
    if (t) call({ action: 'logout', token: t }).catch(() => {})
  }

  if (booting) return <main className="mx-auto max-w-xl px-4 pb-16 pt-10 text-ink/70 sm:px-6">Loading your orders…</main>

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-4xl font-semibold sm:text-5xl">My orders</h1>

      {step === 'email' && (
        <>
          <p className="mt-2 text-ink-soft">Enter the email you used when ordering. We’ll send you a 6-digit code.</p>
          <form onSubmit={requestCode} className="mt-6 space-y-4 rounded-[28px] bg-white p-6 shadow-soft">
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            <Button full size="lg" type="submit" loading={loading}><Mail className="size-4" />Send me a code</Button>
          </form>
        </>
      )}

      {step === 'code' && (
        <>
          <p className="mt-2 text-ink-soft">If <b>{email.trim()}</b> has orders, a code is on its way. Check your spam folder too. It works for 10 minutes.</p>
          <form onSubmit={verify} className="mt-6 space-y-4 rounded-[28px] bg-white p-6 shadow-soft">
            <Field label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" autoComplete="one-time-code" required />
            <Button full size="lg" type="submit" loading={loading} disabled={code.length !== 6}><KeyRound className="size-4" />View my orders</Button>
            <button type="button" onClick={() => setStep('email')} className="mx-auto block min-h-11 text-sm font-semibold text-red">Use a different email or resend</button>
          </form>
        </>
      )}

      {step === 'list' && data && (
        <>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-ink-soft">{data.email}</p>
            <button onClick={logout} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-red hover:bg-yellow-light"><LogOut className="size-4" />Sign out</button>
          </div>

          <div className="mt-4 rounded-[28px] bg-ink p-6 text-white shadow-pop">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow">Total spent</p>
            <p className="font-display text-4xl font-semibold">{naira(data.total_spent)}</p>
            <p className="mt-1 text-sm text-white/70">Across {data.paid_order_count} paid {data.paid_order_count === 1 ? 'order' : 'orders'}. Cancelled and refunded orders are not counted.</p>
          </div>

          {data.order_count === 0 ? (
            <div className="mt-6"><EmptyState icon={<Receipt className="size-7" />} title="No orders yet" action={<Button onClick={() => go('#/order')}>Order now</Button>} /></div>
          ) : (
            <>
              {data.ongoing.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-3 text-2xl font-semibold">Ongoing</h2>
                  <div className="space-y-4">{data.ongoing.map((o) => <OrderCard key={o.order_number} o={o} />)}</div>
                </section>
              )}
              {data.past.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-3 text-2xl font-semibold">Past orders</h2>
                  <div className="space-y-4">{data.past.map((o) => <OrderCard key={o.order_number} o={o} />)}</div>
                </section>
              )}
            </>
          )}
          <div className="mt-6"><Notice>Orders placed with a different email show up when you sign in with that email.</Notice></div>
        </>
      )}
    </main>
  )
}