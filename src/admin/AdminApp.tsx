import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ClipboardList, Settings as Cog, Users, LogOut, Bell, ExternalLink, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useApp } from '../store'
import { Button, Field, Toasts, cx } from '../components/ui'
import { Logo } from '../components/Layout'
import { type AOrder, type Settings } from './data'
import { A, type SlotsByDay } from './adminContext'
import Orders from './Orders'
import SettingsPage from './SettingsPage'
import Customers from './Customers'
import {
  supabase,
  isAdmin as checkIsAdmin,
  fetchOrders as fetchSupaOrders,
  subscribeToOrders,
  adminSetDeliveryFee,
  notify,
} from '../lib/supabase'

/* ------------------------------------------------------------ constants */
type BatchKey = 'fri' | 'sat' | 'sun'
const DOW: Record<BatchKey, number> = { fri: 5, sat: 6, sun: 0 }
const KEY_BY_DOW: Record<number, BatchKey> = { 5: 'fri', 6: 'sat', 0: 'sun' }

// Dashboard stage -> orders.order_status
const STAGE_TO_STATUS: Record<string, string> = {
  new: 'received',
  awaiting: 'received',
  preparing: 'preparing',
  out: 'out_for_delivery',
  ready: 'ready_for_pickup',
  completed: 'completed',
  cancelled: 'cancelled',
}

const EMPTY_SETTINGS: Settings = {
  open: { fri: false, sat: false, sun: false },
  cutoff: { fri: '15:30', sat: '05:00', sun: '05:00' },
  zobo: false,
  zoboPrice: 500,
  maxOn: false,
  max: 150,
  feeOn: 100,
  feeOff: 200,
  slots: [],
}


/* ---------------------------------------------------------------- login */
function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw error
      const ok = await checkIsAdmin()
      if (ok) {
        onIn()
      } else {
        await supabase.auth.signOut()
        setErr('Not authorised')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Incorrect email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-red p-12 text-white lg:flex">
        <Logo light />
        <div>
          <h1 className="text-5xl font-semibold leading-tight">Fry day, sorted.</h1>
          <p className="mt-4 max-w-sm text-lg text-white">Track every order, confirm delivery fees and see exactly how many puff-puff to fry.</p>
        </div>
        <p className="text-sm text-white">Turoob Pastries team portal</p>
        <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-yellow/90" />
        <div className="absolute -bottom-10 right-40 size-40 rounded-full bg-red-dark/60" />
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo /></div>
          <div><h2 className="text-3xl font-semibold">Team login</h2><p className="mt-1 text-ink-soft">Sign in to manage this week's orders.</p></div>
          {err && <div role="alert" className="flex items-center gap-2 rounded-2xl bg-red-tint p-3 text-sm font-medium text-red-dark"><AlertCircle className="size-4 shrink-0" />{err}</div>}
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@turoob.example" required autoComplete="email" />
          <div className="relative">
            <Field label="Password" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" required autoComplete="current-password" valid={false} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-1 top-6.5 grid size-11 place-items-center text-ink/70 hover:text-red">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
          </div>
          <Button full size="lg" type="submit" loading={loading}>Sign in</Button>
          <a href="#/" className="flex min-h-11 items-center justify-center text-sm font-semibold text-red hover:underline">Back to the customer site</a>
        </form>
      </div>
    </main>
  )
}

const NAV = [
  { to: '#/admin', label: 'Orders', icon: ClipboardList },
  { to: '#/admin/settings', label: 'Settings', icon: Cog },
  { to: '#/admin/customers', label: 'Customers', icon: Users },
]

/* ------------------------------------------------------------- AdminApp */
export default function AdminApp() {
  const { route, go, toast } = useApp()
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [orders, setOrdersState] = useState<AOrder[]>([])
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [slotsByDay, setSlotsByDay] = useState<SlotsByDay>({ fri: [], sat: [], sun: [] })

  const ordersRef = useRef<Array<AOrder & { id: string }>>([])
  const batchKeyById = useRef<Record<number, BatchKey>>({})

  const setOrders = (f: (o: AOrder[]) => AOrder[]) => setOrdersState(f)
  const markSeen = (no: string) => setSeen((s) => new Set(s).add(no))
  const fresh = orders.filter((o) => (o.stage === 'new' || o.stage === 'paid') && !seen.has(o.no)).length

  /* ---- session: restore on refresh, react to sign-out ---- */
  useEffect(() => {
    let alive = true
    const verify = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return false
      try { return await checkIsAdmin() } catch { return false }
    }
    verify().then((ok) => {
      if (!alive) return
      setAuthed(ok)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setAuthed(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  /* ---- route protection ---- */
  useEffect(() => {
    if (checking) return
    if (!authed && route !== '#/admin/login') go('#/admin/login')
    if (authed && route === '#/admin/login') go('#/admin')
  }, [authed, checking, route, go])

  const signOut = async () => {
    await supabase.auth.signOut()
    setAuthed(false)
    go('#/admin/login')
  }

  /* ---- load settings (batch_days + products + app_settings) ---- */
  const loadSettings = useCallback(async () => {
    try {
      const [bd, pr, st, sl] = await Promise.all([
        supabase.from('batch_days').select('*'),
        supabase.from('products').select('*').order('sort_order'),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
        supabase.from('delivery_slots').select('batch_day_id,label').eq('is_active', true).order('sort_order'),
      ])
      if (bd.error) throw bd.error
      if (pr.error) throw pr.error
      if (st.error) throw st.error
      if (sl.error) throw sl.error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const days: any[] = bd.data ?? []
      batchKeyById.current = Object.fromEntries(days.filter((d) => KEY_BY_DOW[d.day_of_week]).map((d) => [d.id, KEY_BY_DOW[d.day_of_week]]))
      const row = (k: BatchKey) => days.find((d) => d.day_of_week === DOW[k])
      const hhmm = (t: string | undefined, fallback: string) => (t ? String(t).slice(0, 5) : fallback)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zobos = (pr.data ?? []).filter((p: any) => /zobo/i.test(p.name))
      const maxes = days.map((d) => d.max_portions).filter((m) => m !== null && m !== undefined)

      setSettings({
        open: { fri: !!row('fri')?.is_open, sat: !!row('sat')?.is_open, sun: !!row('sun')?.is_open },
        cutoff: {
          fri: hhmm(row('fri')?.cutoff_time, '15:30'),
          sat: hhmm(row('sat')?.cutoff_time, '05:00'),
          sun: hhmm(row('sun')?.cutoff_time, '05:00'),
        },
        opens: {
          fri: hhmm(row('fri')?.opens_time, '18:00'),
          sat: hhmm(row('sat')?.opens_time, '18:00'),
          sun: hhmm(row('sun')?.opens_time, '18:00'),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        zobo: zobos.some((p: any) => p.is_available),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        zoboPrice: zobos.length ? Math.min(...zobos.map((p: any) => Number(p.price))) : 500,
        maxOn: maxes.length > 0,
        max: maxes.length ? Number(maxes[0]) : 150,
        feeOn: Number(st.data.on_campus_fee ?? 100),
        feeOff: Number(st.data.off_campus_fee ?? 200),
        puffPrice: Number((pr.data ?? []).find((p: { counts_toward_limit: boolean }) => p.counts_toward_limit)?.price ?? 100),
        slots: [],
      })

      const map: SlotsByDay = { fri: [], sat: [], sun: [] }
      for (const r of (sl.data ?? []) as Array<{ batch_day_id: number; label: string }>) {
        const k = batchKeyById.current[r.batch_day_id]
        if (k) map[k].push(r.label)
      }
      setSlotsByDay(map)
      setSettingsLoaded(true)
    } catch (e) {
      console.error('Error loading settings:', e)
      toast('error', 'Could not load settings.')
    }
  }, [toast])

  /* ---- load orders ---- */
  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchSupaOrders()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = data.map((o: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = o.order_items ?? []
        const qty = (test: (n: string) => boolean) =>
          items.filter((i) => test(String(i.product_name).toLowerCase())).reduce((a, i) => a + i.quantity, 0)

        const pending = o.fee_status === 'pending_review'
        const stage: string =
          o.order_status === 'received' ? (pending ? 'awaiting' : o.payment_status === 'paid' ? 'paid' : 'new')
            : o.order_status === 'preparing' ? 'preparing'
              : o.order_status === 'out_for_delivery' ? 'out'
                : o.order_status === 'ready_for_pickup' ? 'ready'
                  : o.order_status === 'completed' ? 'completed'
                    : o.order_status === 'cancelled' ? 'cancelled'
                      : 'new'

        return {
          id: o.id,
          no: o.order_number,
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          pepper: qty((n) => n.includes('pepper') && !n.includes('without')),
          plain: qty((n) => n.includes('without')),
          zobo: qty((n) => n.includes('zobo')),
          mode: o.fulfilment,
          zone: o.zone === 'off_campus' ? 'off' : 'on',
          address: o.delivery_address ?? '',
          slot: o.delivery_slot ?? '',
          fee: o.delivery_fee ?? 0,
          feeFinal: o.fee_status !== 'pending_review',
          linkSent: o.fee_status === 'confirmed' || o.fee_status === 'accepted',
          paid: o.payment_status === 'paid',
          stage,
          batch: batchKeyById.current[o.batch_day_id] ?? 'fri',
          placed: o.created_at ?? '',
          notes: o.notes ?? '',
          feeStatus: o.fee_status,
          batchDate: o.batch_date,
          dbTotal: Number(o.total ?? 0),
        } as unknown as AOrder & { id: string }
      })
      ordersRef.current = mapped
      setOrdersState(mapped)
    } catch (e) {
      console.error('Error loading orders:', e)
      toast('error', 'Could not load orders.')
    }
  }, [toast])

  const reload = useCallback(async () => {
    await loadSettings() // also fills batchKeyById, which loadOrders uses
    await loadOrders()
  }, [loadSettings, loadOrders])

  /* ---- load + live updates once signed in ---- */
  useEffect(() => {
    if (!authed) return
    reload()
    const off = subscribeToOrders((payload) => {
      if (payload.eventType === 'INSERT') toast('info', 'New order received')
      loadOrders()
    })
    return off
  }, [authed, reload, loadOrders, toast])

  /* ---- actions that write to Supabase ---- */
  const idFor = (no: string) => ordersRef.current.find((o) => o.no === no)?.id

  const setStage = useCallback(async (no: string, stage: string) => {
    const id = idFor(no)
    const status = STAGE_TO_STATUS[stage]
    if (!id || !status) return
    const before = ordersRef.current.find((o) => o.no === no)
    const { error } = await supabase.from('orders').update({ order_status: status }).eq('id', id)
    if (error) { toast('error', error.message); return }

    // Pickup orders: tell the customer by email and SMS the moment it is ready.
    // Only when it newly becomes ready, so a double click never texts twice.
    if (stage === 'ready' && before?.mode === 'pickup' && String(before.stage) !== 'ready') {
      try {
        await notify({ type: 'order_ready', order_id: id })
        toast('success', 'Customer told their order is ready')
      } catch (e) {
        console.error('Ready message failed:', e)
        toast('error', 'Marked as ready, but the message to the customer could not be sent.')
      }
    }
    await loadOrders()
  }, [loadOrders, toast])

  const markPaidManually = useCallback(async (no: string) => {
    const id = idFor(no)
    if (!id) return
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', paid_manually: true, paid_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast('error', error.message); return }
    toast('success', 'Marked as paid')
    await loadOrders()
  }, [loadOrders, toast])

  // Set the final delivery fee, then email the customer the accept-and-pay link.
  const confirmFee = useCallback(async (no: string, fee: number) => {
    const id = idFor(no)
    if (!id) return
    try {
      await adminSetDeliveryFee(id, fee)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not set the delivery fee')
      return
    }
    try {
      await notify({ type: 'fee_confirm', order_id: id })
      toast('success', 'Fee confirmed and link emailed to the customer')
    } catch {
      toast('error', 'Fee saved, but the email could not be sent. Try again.')
    }
    await loadOrders()
  }, [loadOrders, toast])

  const saveSettings = useCallback(async (s: Settings, slots: SlotsByDay) => {
    try {
      // batch days
      for (const k of ['fri', 'sat', 'sun'] as BatchKey[]) {
        const { error } = await supabase
          .from('batch_days')
          .update({
            is_open: s.open[k],
            cutoff_time: `${s.cutoff[k]}:00`,
            max_portions: s.maxOn ? s.max : null,
          })
          .eq('day_of_week', DOW[k])
        if (error) throw error
      }
      // fees
      const f = await supabase.from('app_settings').update({ on_campus_fee: s.feeOn, off_campus_fee: s.feeOff }).eq('id', 1)
      if (f.error) throw f.error
      // delivery slots, per day: insert the new list first, then remove the old rows
      const days = await supabase.from('batch_days').select('id, day_of_week')
      if (days.error) throw days.error
      const oldSlots = await supabase.from('delivery_slots').select('id, batch_day_id')
      if (oldSlots.error) throw oldSlots.error
      for (const k of ['fri', 'sat', 'sun'] as BatchKey[]) {
        const day = (days.data ?? []).find((d: { day_of_week: number }) => d.day_of_week === DOW[k])
        if (!day) continue
        if (slots[k].length > 0) {
          const ins = await supabase
            .from('delivery_slots')
            .insert(slots[k].map((label, i) => ({ batch_day_id: day.id, label, sort_order: i, is_active: true })))
          if (ins.error) throw ins.error
        }
        const oldIds = (oldSlots.data ?? [])
          .filter((r: { batch_day_id: number }) => r.batch_day_id === day.id)
          .map((r: { id: number }) => r.id)
        if (oldIds.length > 0) {
          const del = await supabase.from('delivery_slots').delete().in('id', oldIds)
          if (del.error) throw del.error
        }
      }
      // zobo availability (price is only changed when there is a single Zobo product)
      const pr = await supabase.from('products').select('id,name')
      if (pr.error) throw pr.error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zobos = (pr.data ?? []).filter((p: any) => /zobo/i.test(p.name))
      for (const p of zobos) {
        const patch: Record<string, unknown> = { is_available: s.zobo }
        if (zobos.length === 1) patch.price = s.zoboPrice
        const { error } = await supabase.from('products').update(patch).eq('id', p.id)
        if (error) throw error
      }
      toast('success', 'Settings saved')
      await loadSettings()
    } catch (e) {
      console.error('Save settings error:', e)
      toast('error', e instanceof Error ? e.message : 'Could not save settings')
    }
  }, [loadSettings, toast])

  const ctx = useMemo(
    () => ({ orders, setOrders, settings, setSettings, seen, markSeen, slotsByDay, saveSettings, setStage, markPaidManually, confirmFee, reload }),
    [orders, settings, seen, slotsByDay, saveSettings, setStage, markPaidManually, confirmFee, reload],
  )

  if (checking) return <main className="grid min-h-screen place-items-center text-ink-soft">Checking your session…</main>
  if (!authed) return <><Login onIn={() => { setAuthed(true); go('#/admin') }} /><Toasts /></>

  const page = route.replace('#/admin', '')
  const body: ReactNode = page.startsWith('/settings')
    ? (settingsLoaded ? <SettingsPage /> : <p className="text-ink-soft">Loading settings…</p>)
    : page.startsWith('/customers') ? <Customers /> : <Orders />
  const active = (to: string) => (to === '#/admin' ? !page.startsWith('/settings') && !page.startsWith('/customers') : route.startsWith(to))

  return (
    <A.Provider value={ctx}>
      <div className="min-h-screen bg-white text-ink lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink/10 bg-cream/60 p-5 lg:flex">
          <Logo />
          <nav className="mt-8 space-y-1">
            {NAV.map((n) => (
              <a key={n.to} href={n.to} className={cx('flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold transition', active(n.to) ? 'bg-red text-white shadow-soft' : 'text-ink-soft hover:bg-yellow-light/60')}>
                <n.icon className="size-5" />{n.label}
                {n.label === 'Orders' && fresh > 0 && <span className={cx('ml-auto grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold', active(n.to) ? 'bg-white text-red' : 'bg-red text-white')}>{fresh}</span>}
              </a>
            ))}
          </nav>
          <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold text-ink-soft hover:bg-yellow-light/60"><LogOut className="size-5" />Sign out</button>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-ink/10 bg-white">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
              <div className="lg:hidden"><Logo /></div>
              <p className="hidden font-display text-lg font-semibold lg:block">Team dashboard</p>
              <div className="flex items-center gap-2">
                <a href="#/" className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-soft transition hover:bg-yellow-light"><ExternalLink className="size-4" /><span className="hidden sm:inline">View site</span><span className="sr-only sm:hidden">View site</span></a>
                <button aria-label={`${fresh} new orders`} onClick={() => go('#/admin')} className="relative grid size-11 place-items-center rounded-full bg-cream hover:bg-yellow-light"><Bell className="size-5" />{fresh > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red px-1 text-xs font-bold text-white">{fresh}</span>}</button>
                <button aria-label="Sign out" onClick={signOut} className="grid size-11 place-items-center rounded-full bg-cream hover:bg-yellow-light lg:hidden"><LogOut className="size-4" /></button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-4 pb-2 no-scrollbar lg:hidden">
              {NAV.map((n) => <a key={n.to} href={n.to} className={cx('flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold', active(n.to) ? 'bg-red text-white' : 'bg-cream text-ink-soft')}><n.icon className="size-4" />{n.label}</a>)}
            </nav>
          </header>
          <main className="px-4 py-6 sm:px-8">{body}</main>
        </div>
      </div>
      <Toasts />
    </A.Provider>
  )
}