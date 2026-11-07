import { useMemo, useState } from 'react'
import { cx } from '../components/ui'
import { useAdmin } from './adminContext'
import { total, type AOrder } from './data'
import { naira } from '../data'

type Range = 'week' | 'month' | 'all'
const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
]

const inRange = (o: AOrder, r: Range) => {
  if (r === 'all') return true
  const d = new Date(o.placed)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  if (r === 'week') return now.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink/70">{hint}</p>}
    </div>
  )
}

export default function OverallStats() {
  const { orders, settings } = useAdmin()
  const [range, setRange] = useState<Range>('month')

  const s = useMemo(() => {
    const amount = (o: AOrder) => o.dbTotal ?? total(o, settings.zoboPrice, settings.puffPrice)
    const sum = (list: AOrder[]) => list.reduce((a, o) => a + amount(o), 0)
    const scoped = orders.filter((o) => inRange(o, range))
    const live = scoped.filter((o) => o.stage !== 'cancelled')
    const paid = live.filter((o) => o.paid)
    const unpaid = live.filter((o) => !o.paid)
    const collected = sum(paid)
    return {
      count: live.length,
      cancelled: scoped.length - live.length,
      paidCount: paid.length,
      collected,
      awaiting: sum(unpaid),
      awaitingCount: unpaid.length,
      average: paid.length ? Math.round(collected / paid.length) : 0,
      puffs: live.reduce((a, o) => a + o.pepper + o.plain, 0),
      zobo: live.reduce((a, o) => a + o.zobo, 0),
      pickups: live.filter((o) => o.mode === 'pickup').length,
      deliveries: live.filter((o) => o.mode === 'delivery').length,
    }
  }, [orders, settings, range])

  return (
    <section aria-label="Overall summary" className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Overall summary</h2>
        <div className="flex gap-1 rounded-full bg-cream p-1">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={cx('min-h-11 rounded-full px-4 text-sm font-semibold transition', range === r.id ? 'bg-red text-white' : 'text-ink-soft hover:bg-yellow-light')}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total orders" value={String(s.count)} hint={s.cancelled ? `${s.cancelled} cancelled not counted` : `${s.paidCount} paid`} />
        <Stat label="Money collected" value={naira(s.collected)} hint={`${s.paidCount} paid orders`} />
        <Stat label="Awaiting payment" value={naira(s.awaiting)} hint={`${s.awaitingCount} unpaid orders`} />
        <Stat label="Total order value" value={naira(s.collected + s.awaiting)} hint="Paid plus unpaid" />
        <Stat label="Average paid order" value={naira(s.average)} />
        <Stat label="Puff-puff ordered" value={String(s.puffs)} hint="pieces" />
        <Stat label="Zobo ordered" value={String(s.zobo)} hint="bottles" />
        <Stat label="Pickup / delivery" value={`${s.pickups} / ${s.deliveries}`} />
      </div>
    </section>
  )
}