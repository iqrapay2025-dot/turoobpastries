import { useMemo } from 'react'
import { useAdmin } from './adminContext'
import { total, PUFF_PRICE, type AOrder } from './data'
import { naira } from '../data'

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

  const s = useMemo(() => {
    const puff = settings.puffPrice ?? PUFF_PRICE
    const sum = (list: AOrder[]) => list.reduce((a, o) => a + total(o, settings.zoboPrice, puff), 0)
    const live = orders.filter((o) => o.stage !== 'cancelled')
    const paid = live.filter((o) => o.paid)
    const unpaid = live.filter((o) => !o.paid)
    const collected = sum(paid)
    return {
      count: live.length,
      cancelled: orders.length - live.length,
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
  }, [orders, settings])

  return (
    <section aria-label="Overall summary" className="mb-6">
      <h2 className="mb-3 text-xl font-semibold">Overall summary</h2>
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