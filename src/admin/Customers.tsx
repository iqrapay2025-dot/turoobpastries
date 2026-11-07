import { useMemo } from 'react'
import { useAdmin } from './AdminApp'
import { Card } from './ui'
import { naira } from '../data'
import { total } from './data'

export default function Customers() {
  const { orders, settings } = useAdmin()
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; phone: string; n: number; spent: number }>()
    orders.forEach((o) => { const r = m.get(o.phone) ?? { name: o.name, phone: o.phone, n: 0, spent: 0 }; r.n++; if (o.paid) r.spent += total(o, settings.zoboPrice); m.set(o.phone, r) })
    return [...m.values()].sort((a, b) => b.n - a.n || b.spent - a.spent)
  }, [orders, settings.zoboPrice])
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-3xl font-semibold sm:text-4xl">Customers</h1><p className="text-ink/70">{rows.length} customers have ordered.</p></div>
      <Card className="divide-y divide-ink/10 overflow-hidden">
        {rows.map((r) => (
          <div key={r.phone} className="flex items-center gap-4 p-4 transition hover:bg-yellow-light/30">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red font-display font-semibold text-white">{r.name[0]}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.name}</p><p className="text-sm text-ink/70">{r.phone}</p></div>
            <div className="text-right"><p className="font-semibold">{r.n} order{r.n > 1 && 's'}</p><p className="text-sm text-ink/70">{naira(r.spent)} paid</p></div>
          </div>
        ))}
      </Card>
    </div>
  )
}
