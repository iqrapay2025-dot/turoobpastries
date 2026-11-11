import { useEffect, useMemo, useState } from 'react'
import { Search, X, Phone, MapPin, Clock, Store, Bike, Send, CheckCircle2, ChefHat, PackageCheck, Flag, Flame, Droplets, GlassWater, Gift } from 'lucide-react'
import { Button, EmptyState, cx } from '../components/ui'
import { BATCHES, naira, type BatchId } from '../data'
import { Card, StagePill, PayPill } from './ui'
import { STAGES, PUFF_PRICE, items, sub, total, type AOrder, type Stage } from './data'
import { useAdmin } from './adminContext'
import OverallStats from './OverallStats'
import ReportDownload from './ReportDownload'
import { WhatsAppIcon } from '../components/Layout'
import { waLink, orderMessage } from '../lib/whatsapp'
import { takePendingOrder, subscribeOpenOrder } from './openOrder'

const digits = (s: string) => s.replace(/\D/g, '').slice(-10)
const placedText = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
const live = (o: AOrder) => o.stage !== 'cancelled'

// Weekday number for each batch (0 = Sunday ... 6 = Saturday).
const BATCH_DOW: Record<BatchId, number> = { fri: 5, sat: 6, sun: 0 }

// The date of the coming batch for that day (today counts), as "YYYY-MM-DD" in Lagos time.
function nextBatchDate(id: BatchId): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + ((BATCH_DOW[id] - d.getUTCDay() + 7) % 7))
  return d.toISOString().slice(0, 10)
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-cream/70 p-4"><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-ink/70">{icon}{label}</div><p className="font-display text-2xl font-semibold">{value}</p></div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex gap-3 text-sm"><span className="mt-0.5 text-red">{icon}</span><div>{children}</div></div>
}

// Small tag shown in the orders list so gift orders stand out.
function GiftTag({ o }: { o: AOrder }) {
  if (!o.isGift) return null
  return (
    <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-yellow-light px-2 py-0.5 text-xs font-bold text-red-dark">
      <Gift className="size-3 shrink-0" /><span className="truncate">Gift{o.recipientName ? ` for ${o.recipientName}` : ''}</span>
    </span>
  )
}

function BatchSummary() {
  const { orders, settings } = useAdmin()
  const [b, setB] = useState<BatchId>('fri')
  // Only the coming batch for the selected day, never older weeks.
  const date = nextBatchDate(b)
  const list = orders.filter((o) => o.batch === b && live(o) && o.batchDate === date)
  const sum = (k: 'pepper' | 'plain' | 'zobo') => list.reduce((a, o) => a + o[k], 0)
  const pieces = sum('pepper') + sum('plain')
  const revenue = list.filter((o) => o.paid).reduce((a, o) => a + total(o, settings.zoboPrice, settings.puffPrice), 0)
  const full = settings.maxOn && pieces >= settings.max
  const pct = settings.max > 0 ? Math.min(100, Math.round((pieces / settings.max) * 100)) : 0
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Batch summary</h2><p className="text-sm text-ink/70">What to fry for the selected batch (cancelled orders excluded)</p></div>
        <div className="flex gap-1 rounded-full bg-cream p-1">{BATCHES.map((x) => <button key={x.id} onClick={() => setB(x.id)} className={cx('min-h-11 rounded-full px-4 text-sm font-semibold transition', b === x.id ? 'bg-red text-white' : 'text-ink-soft hover:bg-yellow-light')}>{x.day.slice(0, 3)}</button>)}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 rounded-2xl bg-red p-4 text-white lg:col-span-1"><p className="text-xs font-semibold text-white">Total pieces to fry</p><p className="font-display text-4xl font-semibold">{pieces}</p></div>
        <Stat icon={<Flame className="size-4 text-red" />} label="With pepper" value={sum('pepper')} />
        <Stat icon={<Droplets className="size-4 text-red-dark" />} label="Without pepper" value={sum('plain')} />
        <Stat icon={<GlassWater className="size-4 text-red" />} label="Zobo bottles" value={sum('zobo')} />
        <Stat icon={<span className="font-bold text-red">₦</span>} label="Paid revenue" value={naira(revenue)} />
        <Stat icon={<span className="font-bold text-red">#</span>} label="Orders" value={list.length} />
        <Stat icon={<Store className="size-4 text-red" />} label="Pickups" value={list.filter((o) => o.mode === 'pickup').length} />
        <Stat icon={<Bike className="size-4 text-red" />} label="Deliveries" value={list.filter((o) => o.mode === 'delivery').length} />
      </div>
      {settings.maxOn && (
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs font-semibold"><span>Portions used</span><span className={full ? 'text-red' : 'text-ink/70'}>{full ? 'Sold out' : `${pieces} of ${settings.max}`}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/10"><div className={cx('h-full rounded-full transition-all', full ? 'bg-ink' : 'bg-red')} style={{ width: pct + '%' }} /></div>
        </div>
      )}
    </Card>
  )
}

function Drawer({ no, onClose }: { no: string; onClose: () => void }) {
  const { orders, settings, setStage, markPaidManually, markRefunded, confirmFee } = useAdmin()
  const o = orders.find((x) => x.no === no)
  const [fee, setFee] = useState(String(o?.fee || settings.feeOff))
  const [busy, setBusy] = useState(false)

  // Refresh the field only when the saved fee changes, so typing isn't overwritten by live updates.
  useEffect(() => { if (o) setFee(String(o.fee || settings.feeOff)) }, [o?.fee]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!o) return null

  const pp = settings.puffPrice ?? PUFF_PRICE
  const waHref = waLink(o.phone, orderMessage(o, 'Central Mosque, Unilorin'))

  const run = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  const feeNum = Number(fee)
  const feeErr = !fee || isNaN(feeNum) || feeNum < 0 ? 'Enter a valid amount' : ''
  const cancelled = o.stage === 'cancelled'
  const showFee = o.mode === 'delivery' && !o.paid && !cancelled
  const showManualPaid = !o.paid && o.feeFinal && !cancelled

  const next: { stage: Stage; label: string; icon: React.ReactNode; show: boolean }[] = [
    { stage: 'preparing', label: 'Mark as preparing', icon: <ChefHat className="size-4" />, show: o.paid && o.stage === 'paid' },
    { stage: 'out', label: o.mode === 'delivery' ? 'Out for delivery' : 'Ready for pickup', icon: <PackageCheck className="size-4" />, show: o.stage === 'preparing' },
    { stage: 'completed', label: 'Mark completed', icon: <Flag className="size-4" />, show: o.stage === 'out' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside role="dialog" aria-modal aria-label={`Order ${o.no}`} onClick={(e) => e.stopPropagation()} className="pop-in mt-12 flex h-[calc(100%-3rem)] w-full flex-col rounded-t-[28px] bg-white shadow-pop sm:mt-0 sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[28px]">
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 p-5">
          <div><p className="font-display text-2xl font-semibold">{o.no}</p><p className="text-sm text-ink/70">{placedText(o.placed)} · {BATCHES.find((b) => b.id === o.batch)?.day ?? ''} batch</p><div className="mt-2 flex gap-2"><StagePill o={o} /><PayPill o={o} /></div></div>
          <button aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-cream hover:bg-yellow-light"><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="space-y-3">
            {o.isGift && (
              <div className="rounded-2xl border-2 border-yellow bg-yellow-light/50 p-3 text-sm">
                <p className="flex items-center gap-2 font-bold"><Gift className="size-4 text-red" />Gift for {o.recipientName}</p>
                {o.recipientPhone && <p className="mt-1"><a href={`tel:${o.recipientPhone}`} className="hover:underline">{o.recipientPhone}</a></p>}
                {o.giftMessage && <p className="mt-1">“{o.giftMessage}”</p>}
                <p className="mt-1 text-xs text-ink/70">Deliver or hand over to the recipient. The address below is theirs.</p>
              </div>
            )}
            <h3 className="text-base font-semibold">{o.isGift ? 'Buyer' : 'Customer'}</h3>
            <p className="font-semibold">{o.name}</p>
            <Row icon={<Phone className="size-4" />}><a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a></Row>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft">
                <WhatsAppIcon className="size-4 text-yellow" />Message on WhatsApp
              </a>
            )}
            <Row icon={o.mode === 'delivery' ? <MapPin className="size-4" /> : <Store className="size-4" />}>{o.mode === 'delivery' ? <>{o.address}<span className="block text-ink/70">{o.zone === 'on' ? 'On-campus' : 'Off-campus'} delivery</span></> : 'Pickup at Central Mosque, Unilorin'}</Row>
            <Row icon={<Clock className="size-4" />}>Time slot: {o.slot}</Row>
            {o.notes && <p className="rounded-2xl bg-yellow-light/60 p-3 text-sm"><b>Note:</b> {o.notes}</p>}
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold">Items</h3>
            <ul className="divide-y divide-ink/10 text-sm">
              {o.pepper > 0 && <li className="flex justify-between py-2"><span>{o.pepper}× Puff-Puff (With Pepper)</span><b>{naira(o.pepper * pp)}</b></li>}
              {o.plain > 0 && <li className="flex justify-between py-2"><span>{o.plain}× Puff-Puff (Without Pepper)</span><b>{naira(o.plain * pp)}</b></li>}
              {o.zobo > 0 && <li className="flex justify-between py-2"><span>{o.zobo}× Zobo (Bliss Blend)</span><b>{naira(o.zobo * settings.zoboPrice)}</b></li>}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-dashed border-ink/20 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{naira(sub(o, settings.zoboPrice, pp))}</dd></div>
              <div className="flex justify-between"><dt>Delivery fee</dt><dd>{o.mode === 'pickup' ? 'Pickup' : o.feeFinal ? naira(o.fee) : naira(o.fee) + ' (estimate)'}</dd></div>
              <div className="flex justify-between pt-1 font-display text-xl font-semibold"><dt>Total</dt><dd className="text-red">{naira(total(o, settings.zoboPrice, pp))}</dd></div>
            </dl>
          </section>

          {cancelled && (
            <p className="rounded-2xl bg-cream p-4 text-sm font-semibold text-ink-soft">
              This order was cancelled (for example, the customer declined the delivery fee).
              {o.paid && ' The customer has paid, so send their money back, then mark it as refunded below.'}
              {o.paymentStatus === 'refunded' && ' The payment has been refunded.'}
            </p>
          )}

          {showFee && (
            <section className="rounded-3xl border-2 border-yellow bg-yellow-light/40 p-4">
              <h3 className="text-base font-semibold">Final delivery fee</h3>
              <p className="mb-3 text-sm text-ink-soft">Confirm the fee for this address. The customer is emailed a link to accept and pay, or decline.</p>
              <label className="block text-sm font-semibold">Fee (₦)
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white font-bold">₦</span>
                  <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} aria-invalid={!!feeErr} className={cx('h-12 min-w-0 flex-1 rounded-2xl border-2 bg-white px-4 text-lg font-semibold outline-none focus:border-yellow-dark focus:ring-4 focus:ring-yellow/30', feeErr ? 'border-red' : 'border-yellow-light')} />
                </div>
              </label>
              {feeErr && <p className="mt-1 text-sm font-medium text-red">{feeErr}</p>}
              <div className="mt-3 flex flex-wrap gap-2">{[settings.feeOn, settings.feeOff, 300].map((n) => <button key={n} onClick={() => setFee(String(n))} className="min-h-11 rounded-full bg-white px-4 text-sm font-bold hover:bg-yellow">{naira(n)}</button>)}</div>
              <Button full className="mt-4" disabled={!!feeErr || busy} loading={busy} onClick={() => run(() => confirmFee(o.no, feeNum))}><Send className="size-4" />{o.linkSent ? 'Update fee and resend email' : 'Confirm fee and email customer'}</Button>
              {o.linkSent && <p className="mt-2 text-center text-xs text-ink/70">Customer emailed. Waiting for them to accept and pay.</p>}
            </section>
          )}
        </div>

        <div className="space-y-2 border-t border-ink/10 bg-cream/50 p-5">
          {showManualPaid && <Button full variant="secondary" disabled={busy} onClick={() => { if (window.confirm(`Mark ${o.no} as paid? Only do this if you have received the money outside Paystack.`)) run(() => markPaidManually(o.no)) }}><CheckCircle2 className="size-4" />Mark as paid manually</Button>}
          {next.filter((n) => n.show).map((n) => <Button key={n.stage} full size="lg" disabled={busy} onClick={() => run(async () => { await setStage(o.no, n.stage) })}>{n.icon}{n.label}</Button>)}
          {!cancelled && o.stage !== 'completed' && (
            <Button full variant="ghost" disabled={busy} onClick={() => {
              const warn = o.paid ? ' It is already paid. After cancelling, refund the customer and mark it as refunded.' : ''
              if (window.confirm(`Cancel ${o.no}?${warn}`)) run(() => setStage(o.no, 'cancelled'))
            }}>Cancel order</Button>
          )}
          {cancelled && o.paid && <Button full variant="secondary" disabled={busy} onClick={() => { if (window.confirm(`Mark ${o.no} as refunded? Only do this after you have sent ${naira(total(o, settings.zoboPrice, pp))} back to the customer (for example from the Paystack dashboard).`)) run(() => markRefunded(o.no)) }}><CheckCircle2 className="size-4" />Mark as refunded</Button>}
          {o.stage === 'completed' && <p className="text-center text-sm font-semibold text-ink/70">This order is complete.</p>}
        </div>
      </aside>
    </div>
  )
}

export default function Orders() {
  const { orders, seen, markSeen, settings } = useAdmin()
  const [tab, setTab] = useState<Stage | 'all'>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    const p = takePendingOrder()
    if (p) setOpen(p)
    return subscribeOpenOrder((no) => { takePendingOrder(); setOpen(no) })
  }, [])

  const inTab = (o: AOrder, t: Stage | 'all') => t === 'all' || o.stage === t
  const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.id, orders.filter((o) => inTab(o, s.id)).length])), [orders])
  const term = q.toLowerCase().trim()
  const qDigits = digits(q)
  const matches = (o: AOrder) =>
    !term ||
    o.name.toLowerCase().includes(term) ||
    o.no.toLowerCase().includes(term) ||
    o.phone.includes(term) ||
    (o.recipientName ?? '').toLowerCase().includes(term) ||
    (o.recipientPhone ?? '').includes(term) ||
    (qDigits.length >= 4 && (digits(o.phone).includes(qDigits) || digits(o.recipientPhone ?? '').includes(qDigits)))
  const list = orders.filter((o) => inTab(o, tab) && matches(o))
  const view = (o: AOrder) => { markSeen(o.no); setOpen(o.no) }
  const isNew = (o: AOrder) => (o.stage === 'new' || o.stage === 'paid') && !seen.has(o.no)
  const tot = (o: AOrder) => total(o, settings.zoboPrice, settings.puffPrice)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div><h1 className="text-3xl font-semibold sm:text-4xl">Orders</h1><p className="text-ink/70">Live orders for this week's batches.</p></div>
      <OverallStats />
      <ReportDownload />
      <BatchSummary />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {STAGES.map((s) => (
            <button key={s.id} onClick={() => setTab(s.id)} className={cx('flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition', tab === s.id ? 'border-red bg-red text-white' : 'border-ink/10 bg-white text-ink-soft hover:border-red hover:text-red')}>
              {s.label}<span className={cx('rounded-full px-2 text-xs', tab === s.id ? 'bg-white/25' : 'bg-cream')}>{counts[s.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/70" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or order no." className="h-11 w-full rounded-full border border-ink/15 bg-white pl-11 pr-4 text-sm outline-none focus:border-yellow-dark focus:ring-4 focus:ring-yellow/30" /></label>
      </div>

      {list.length === 0 ? <EmptyState icon={<Search className="size-7" />} title="No orders found">Try another filter or search term.</EmptyState> : (
        <>
          <Card className="hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/70 text-xs uppercase tracking-wider text-ink/70"><tr>{['Order', 'Customer', 'Items', 'Type', 'Slot', 'Total', 'Payment', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-ink/10">
                {list.map((o) => (
                  <tr key={o.no} tabIndex={0} onClick={() => view(o)} onKeyDown={(e) => e.key === 'Enter' && view(o)} className="cursor-pointer transition hover:bg-yellow-light/30 focus-visible:bg-yellow-light/40">
                    <td className="px-4 py-3.5 font-bold">{isNew(o) && <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-red align-middle" />}{o.no}<span className="block text-xs font-normal text-ink/70">{placedText(o.placed)}</span></td>
                    <td className="px-4 py-3.5"><b className="font-semibold">{o.name}</b><span className="block text-xs text-ink/70">{o.phone}</span><GiftTag o={o} /></td>
                    <td className="px-4 py-3.5 text-ink-soft">{items(o)} items<span className="block text-xs text-ink/70">{[o.pepper && `${o.pepper} pepper`, o.plain && `${o.plain} plain`, o.zobo && `${o.zobo} zobo`].filter(Boolean).join(', ')}</span></td>
                    <td className="px-4 py-3.5">{o.mode === 'pickup' ? 'Pickup' : <>Delivery<span className="block max-w-42.5 truncate text-xs text-ink/70">{o.address}</span></>}</td>
                    <td className="px-4 py-3.5">{o.slot}</td>
                    <td className="px-4 py-3.5 font-bold">{naira(tot(o))}</td>
                    <td className="px-4 py-3.5"><PayPill o={o} /></td>
                    <td className="px-4 py-3.5"><StagePill o={o} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {list.map((o) => (
              <button key={o.no} onClick={() => view(o)} className="relative rounded-3xl border border-ink/10 bg-white p-4 text-left shadow-[0_2px_12px_-4px_rgba(17,17,17,.08)] transition active:scale-[.99] hover:border-red">
                {isNew(o) && <span className="absolute right-4 top-4 size-2.5 animate-pulse rounded-full bg-red" />}
                <div className="flex items-start justify-between gap-2 pr-4"><div><p className="font-display text-lg font-semibold">{o.no}</p><p className="text-xs text-ink/70">{placedText(o.placed)}</p></div><p className="font-display text-lg font-semibold text-red">{naira(tot(o))}</p></div>
                <p className="mt-2 font-semibold">{o.name}</p>
                <GiftTag o={o} />
                <p className="text-sm text-ink/70">{items(o)} items · {o.mode === 'pickup' ? 'Pickup' : `Delivery, ${o.slot}`}</p>
                <div className="mt-3 flex flex-wrap gap-2"><StagePill o={o} /><PayPill o={o} /></div>
              </button>
            ))}
          </div>
        </>
      )}
      {open && <Drawer no={open} onClose={() => setOpen(null)} />}
    </div>
  )
}