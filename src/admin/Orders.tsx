import { useMemo, useState } from 'react'
import { Search, X, Phone, MapPin, Clock, Store, Bike, Send, CheckCircle2, ChefHat, PackageCheck, Flag, Flame, Droplets, GlassWater } from 'lucide-react'
import { useApp } from '../store'
import { Button, EmptyState, cx } from '../components/ui'
import { BATCHES, naira, type BatchId } from '../data'
import { useAdmin } from './AdminApp'
import { Card, StagePill, PayPill } from './ui'
import { STAGES, items, sub, total, type AOrder, type Stage } from './data'

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-cream/70 p-4"><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-ink/70">{icon}{label}</div><p className="font-display text-2xl font-semibold">{value}</p></div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex gap-3 text-sm"><span className="mt-0.5 text-red">{icon}</span><div>{children}</div></div>
}

function BatchSummary() {
  const { orders, settings } = useAdmin()
  const [b, setB] = useState<BatchId>('fri')
  const list = orders.filter((o) => o.batch === b)
  const sum = (k: 'pepper' | 'plain' | 'zobo') => list.reduce((a, o) => a + o[k], 0)
  const pieces = sum('pepper') + sum('plain')
  const revenue = list.filter((o) => o.paid).reduce((a, o) => a + total(o, settings.zoboPrice), 0)
  const full = settings.maxOn && pieces >= settings.max
  const pct = Math.min(100, Math.round((pieces / settings.max) * 100))
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Batch summary</h2><p className="text-sm text-ink/70">What to fry for the selected batch</p></div>
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
  const { orders, setOrders, settings } = useAdmin()
  const { toast } = useApp()
  const o = orders.find((x) => x.no === no)!
  const [fee, setFee] = useState(String(o.fee || settings.feeOff))
  const patch = (p: Partial<AOrder>) => setOrders((l) => l.map((x) => (x.no === no ? { ...x, ...p } : x)))
  const feeNum = Number(fee)
  const feeErr = !fee || isNaN(feeNum) || feeNum < 0 ? 'Enter a valid amount' : ''
  const next: { stage: Stage; label: string; icon: React.ReactNode; show: boolean }[] = [
    { stage: 'preparing', label: 'Mark as preparing', icon: <ChefHat className="size-4" />, show: o.paid && o.stage === 'paid' },
    { stage: 'out', label: o.mode === 'delivery' ? 'Out for delivery' : 'Ready for pickup', icon: <PackageCheck className="size-4" />, show: o.stage === 'preparing' },
    { stage: 'completed', label: 'Mark completed', icon: <Flag className="size-4" />, show: o.stage === 'out' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside role="dialog" aria-modal aria-label={`Order ${o.no}`} onClick={(e) => e.stopPropagation()} className="pop-in mt-12 flex h-[calc(100%-3rem)] w-full flex-col rounded-t-[28px] bg-white shadow-pop sm:mt-0 sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[28px]">
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 p-5">
          <div><p className="font-display text-2xl font-semibold">{o.no}</p><p className="text-sm text-ink/70">{o.placed} · {BATCHES.find((b) => b.id === o.batch)!.day} batch</p><div className="mt-2 flex gap-2"><StagePill o={o} /><PayPill o={o} /></div></div>
          <button aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-cream hover:bg-yellow-light"><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="space-y-3">
            <h3 className="text-base font-semibold">Customer</h3>
            <p className="font-semibold">{o.name}</p>
            <Row icon={<Phone className="size-4" />}><a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a></Row>
            <Row icon={o.mode === 'delivery' ? <MapPin className="size-4" /> : <Store className="size-4" />}>{o.mode === 'delivery' ? <>{o.address}<span className="block text-ink/70">{o.zone === 'on' ? 'On-campus' : 'Off-campus'} delivery</span></> : 'Pickup at Central Mosque, Unilorin'}</Row>
            <Row icon={<Clock className="size-4" />}>Time slot: {o.slot}</Row>
            {o.notes && <p className="rounded-2xl bg-yellow-light/60 p-3 text-sm"><b>Note:</b> {o.notes}</p>}
          </section>

          <section>
            <h3 className="mb-2 text-base font-semibold">Items</h3>
            <ul className="divide-y divide-ink/10 text-sm">
              {o.pepper > 0 && <li className="flex justify-between py-2"><span>{o.pepper}× Puff-Puff (With Pepper)</span><b>{naira(o.pepper * 100)}</b></li>}
              {o.plain > 0 && <li className="flex justify-between py-2"><span>{o.plain}× Puff-Puff (Without Pepper)</span><b>{naira(o.plain * 100)}</b></li>}
              {o.zobo > 0 && <li className="flex justify-between py-2"><span>{o.zobo}× Zobo (Bliss Blend)</span><b>{naira(o.zobo * settings.zoboPrice)}</b></li>}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-dashed border-ink/20 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{naira(sub(o, settings.zoboPrice))}</dd></div>
              <div className="flex justify-between"><dt>Delivery fee</dt><dd>{o.mode === 'pickup' ? 'Pickup' : o.feeFinal ? naira(o.fee) : naira(o.fee) + ' (estimate)'}</dd></div>
              <div className="flex justify-between pt-1 font-display text-xl font-semibold"><dt>Total</dt><dd className="text-red">{naira(total(o, settings.zoboPrice))}</dd></div>
            </dl>
          </section>

          {o.mode === 'delivery' && !o.paid && (
            <section className="rounded-3xl border-2 border-yellow bg-yellow-light/40 p-4">
              <h3 className="text-base font-semibold">Final delivery fee</h3>
              <p className="mb-3 text-sm text-ink-soft">Confirm the fee for this address, then send the customer a payment link.</p>
              <label className="block text-sm font-semibold">Fee (₦)
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white font-bold">₦</span>
                  <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} aria-invalid={!!feeErr} className={cx('h-12 min-w-0 flex-1 rounded-2xl border-2 bg-white px-4 text-lg font-semibold outline-none focus:border-yellow-dark focus:ring-4 focus:ring-yellow/30', feeErr ? 'border-red' : 'border-yellow-light')} />
                </div>
              </label>
              {feeErr && <p className="mt-1 text-sm font-medium text-red">{feeErr}</p>}
              <div className="mt-3 flex flex-wrap gap-2">{[settings.feeOn, settings.feeOff, 300].map((n) => <button key={n} onClick={() => setFee(String(n))} className="min-h-11 rounded-full bg-white px-4 text-sm font-bold hover:bg-yellow">{naira(n)}</button>)}</div>
              <Button full className="mt-4" disabled={!!feeErr} onClick={() => { patch({ fee: feeNum, feeFinal: true, linkSent: true, stage: 'new' }); toast('success', `Payment link sent to ${o.name.split(' ')[0]} for ${naira(feeNum)} delivery`) }}><Send className="size-4" />{o.linkSent ? 'Resend payment link' : 'Set fee and send payment link'}</Button>
              {o.linkSent && <p className="mt-2 text-center text-xs text-ink/70">Link sent. Waiting for payment.</p>}
            </section>
          )}
        </div>

        <div className="space-y-2 border-t border-ink/10 bg-cream/50 p-5">
          {!o.paid && o.feeFinal && <Button full variant="secondary" onClick={() => { patch({ paid: true, stage: 'paid' }); toast('success', 'Marked as paid') }}><CheckCircle2 className="size-4" />Mark as paid manually</Button>}
          {next.filter((n) => n.show).map((n) => <Button key={n.stage} full size="lg" onClick={() => { patch({ stage: n.stage }); toast('success', `${o.no}: ${n.label}`) }}>{n.icon}{n.label}</Button>)}
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
  const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.id, s.id === 'all' ? orders.length : orders.filter((o) => o.stage === s.id).length])), [orders])
  const list = orders.filter((o) => (tab === 'all' || o.stage === tab) && (!q || [o.name, o.phone, o.no].some((v) => v.toLowerCase().includes(q.toLowerCase().trim()))))
  const view = (o: AOrder) => { markSeen(o.no); setOpen(o.no) }
  const isNew = (o: AOrder) => o.stage === 'new' && !seen.has(o.no)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div><h1 className="text-3xl font-semibold sm:text-4xl">Orders</h1><p className="text-ink/70">Live orders for this week's batches.</p></div>
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
                    <td className="px-4 py-3.5 font-bold">{isNew(o) && <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-red align-middle" />}{o.no}<span className="block text-xs font-normal text-ink/70">{o.placed}</span></td>
                    <td className="px-4 py-3.5"><b className="font-semibold">{o.name}</b><span className="block text-xs text-ink/70">{o.phone}</span></td>
                    <td className="px-4 py-3.5 text-ink-soft">{items(o)} items<span className="block text-xs text-ink/70">{[o.pepper && `${o.pepper} pepper`, o.plain && `${o.plain} plain`, o.zobo && `${o.zobo} zobo`].filter(Boolean).join(', ')}</span></td>
                    <td className="px-4 py-3.5">{o.mode === 'pickup' ? 'Pickup' : <>Delivery<span className="block max-w-[170px] truncate text-xs text-ink/70">{o.address}</span></>}</td>
                    <td className="px-4 py-3.5">{o.slot}</td>
                    <td className="px-4 py-3.5 font-bold">{naira(total(o, settings.zoboPrice))}</td>
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
                <div className="flex items-start justify-between gap-2 pr-4"><div><p className="font-display text-lg font-semibold">{o.no}</p><p className="text-xs text-ink/70">{o.placed}</p></div><p className="font-display text-lg font-semibold text-red">{naira(total(o, settings.zoboPrice))}</p></div>
                <p className="mt-2 font-semibold">{o.name}</p>
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
