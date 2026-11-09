import { useEffect, useState } from 'react'
import { X, BellOff } from 'lucide-react'
import { Button, cx } from '../components/ui'
import { useAdmin } from './adminContext'
import { total, type AOrder } from './data'

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(m)) return ''
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} d ago`
}

const summary = (o: AOrder) =>
  [o.pepper && `${o.pepper} pepper`, o.plain && `${o.plain} plain`, o.zobo && `${o.zobo} zobo`].filter(Boolean).join(', ')

function OrderRow({ o, onOpen }: { o: AOrder; onOpen: (no: string) => void }) {
  const { settings, setStage, confirmFee } = useAdmin()
  const [fee, setFee] = useState(String(o.fee || settings.feeOff))
  const [busy, setBusy] = useState(false)
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f() } finally { setBusy(false) } }
  const amount = total(o, settings.zoboPrice, settings.puffPrice ?? 100)
    const cancel = () => {
    const warn = o.paid ? ' It is already paid, so you must refund the customer yourself.' : ''
    if (window.confirm(`Cancel ${o.no}?${warn}`)) run(() => setStage(o.no, 'cancelled'))
  }

  return (
    <li className="rounded-2xl border border-ink/10 bg-white p-3.5">
      <button onClick={() => onOpen(o.no)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{o.no} · {o.name}</p>
            <p className="text-sm text-ink/70">{summary(o) || 'No items'}</p>
          </div>
          <p className="shrink-0 text-xs font-medium text-ink/60">{ago(o.placed)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-yellow-light px-2.5 py-1">
            {o.mode === 'pickup' ? 'Pickup' : `Delivery${o.slot ? ` · ${o.slot}` : ''}`}
          </span>
          <span className={cx('rounded-full px-2.5 py-1', o.paid ? 'bg-ink text-white' : 'bg-red-tint text-red-dark')}>{o.paid ? 'Paid' : 'Unpaid'}</span>
          <span className="ml-auto text-sm">{naira(amount)}</span>
        </div>
        {o.mode === 'delivery' && o.address && <p className="mt-2 text-sm text-ink/70">{o.address}</p>}
      </button>

            {o.stage === 'awaiting' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
          <label className="flex items-center gap-1 rounded-2xl border-2 border-yellow-light bg-white px-3 focus-within:border-yellow-dark">
            <span className="font-bold text-ink/70">₦</span>
            <input aria-label={`Delivery fee for ${o.no}`} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} className="h-11 w-20 bg-transparent text-right font-semibold outline-none" />
          </label>
          <Button size="sm" loading={busy} disabled={!fee} onClick={() => run(() => confirmFee(o.no, Number(fee)))}>Confirm fee</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel order</Button>
        </div>
      )}
    </li>
  )
}

export default function NotificationsPanel({ open, onClose, onOpenOrder }: { open: boolean; onClose: () => void; onOpenOrder: (no: string) => void }) {
  const { orders, seen, markSeen } = useAdmin()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const newest = (a: AOrder, b: AOrder) => String(b.placed).localeCompare(String(a.placed))
  const awaiting = orders.filter((o) => o.stage === 'awaiting').sort(newest)
  const fresh = orders.filter((o) => (o.stage === 'new' || o.stage === 'paid') && !seen.has(o.no)).sort(newest)
  const unseen = fresh.length

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Order notifications">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-cream shadow-pop sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-105 sm:rounded-none">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4">
          <h2 className="text-xl font-semibold">Needs attention</h2>
          <div className="flex items-center gap-1">
            {unseen > 0 && <Button size="sm" variant="ghost" onClick={() => fresh.forEach((o) => markSeen(o.no))}>Mark all as seen</Button>}
            <button autoFocus aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-yellow-light"><X className="size-5" /></button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {awaiting.length === 0 && fresh.length === 0 && (
            <div className="grid place-items-center gap-2 py-16 text-center text-ink/70">
              <BellOff className="size-8" />
              <p className="font-semibold">No new orders</p>
              <p className="text-sm">You're all caught up.</p>
            </div>
          )}
          {awaiting.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-red">Awaiting your fee ({awaiting.length})</h3>
              <ul className="space-y-3">{awaiting.map((o) => <OrderRow key={o.no} o={o} onOpen={onOpenOrder} />)}</ul>
            </section>
          )}
          {fresh.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/70">New and paid ({fresh.length})</h3>
              <ul className="space-y-3">{fresh.map((o) => <OrderRow key={o.no} o={o} onOpen={onOpenOrder} />)}</ul>
            </section>
          )}
        </div>

        <div className="border-t border-ink/10 p-3">
          <a href="#/admin" onClick={onClose} className="flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft">View all orders</a>
        </div>
      </div>
    </div>
  )
}