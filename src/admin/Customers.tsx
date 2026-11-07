import { useMemo } from 'react'
import { Card } from './ui'
import { naira } from '../data'
import { total } from './data'
import { useAdmin } from './adminContext'

const key = (phone: string) => phone.replace(/\D/g, '').slice(-10) || phone

export default function Customers() {
  const { orders, settings } = useAdmin()
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; phone: string; n: number; spent: number }>()
    orders
      .filter((o) => o.stage !== 'cancelled')
      .forEach((o) => {
        const k = key(o.phone)
        const r = m.get(k) ?? { name: o.name, phone: o.phone, n: 0, spent: 0 }
        r.n++
        if (o.paid) r.spent += total(o, settings.zoboPrice, settings.puffPrice)
        m.set(k, r)
      })
    return [...m.values()].sort((a, b) => b.n - a.n || b.spent - a.spent)
  }, [orders, settings.zoboPrice, settings.puffPrice])

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Customers</h1>
        <p className="text-ink/70">{rows.length} {rows.length === 1 ? 'customer has' : 'customers have'} ordered.</p>
      </div>
      <Card className="divide-y divide-ink/10 overflow-hidden">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-ink/70">No orders yet.</p>}
        {rows.map((r) => (
          <div key={key(r.phone)} className="flex items-center gap-4 p-4 transition hover:bg-yellow-light/30">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red font-display font-semibold text-white">{(r.name.trim()[0] ?? '?').toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.name || 'Unnamed'}</p><p className="text-sm text-ink/70">{r.phone}</p></div>
            <div className="text-right"><p className="font-semibold">{r.n} {r.n === 1 ? 'order' : 'orders'}</p><p className="text-sm text-ink/70">{naira(r.spent)} paid</p></div>
          </div>
        ))}
      </Card>
    </div>
  )
}