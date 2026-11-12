import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import { Card } from './ui'
import { Button } from '../components/ui'
import { naira } from '../data'
import { total } from './data'
import { useAdmin } from './adminContext'
import { useApp } from '../store'
import { fetchCustomers, setCustomerBlocked } from '../lib/supabase'

type Cust = { id: string; customer_code: string; email: string; full_name: string; phone: string; is_blocked: boolean; blocked_reason: string | null }

export default function Customers() {
  const { orders, settings } = useAdmin()
  const { toast } = useApp()
  const [custs, setCusts] = useState<Cust[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setCusts((await fetchCustomers()) as Cust[]) } catch (e) { console.error(e); toast('error', 'Could not load customers.') }
  }, [toast])
  useEffect(() => { void load() }, [load])

  // Order totals per customer, matched by email (a customer is one email).
  const stats = useMemo(() => {
    const m = new Map<string, { n: number; spent: number }>()
    orders.filter((o) => o.stage !== 'cancelled').forEach((o) => {
      const k = o.email.trim().toLowerCase()
      const r = m.get(k) ?? { n: 0, spent: 0 }
      r.n++
      if (o.paid) r.spent += total(o, settings.zoboPrice, settings.puffPrice)
      m.set(k, r)
    })
    return m
  }, [orders, settings.zoboPrice, settings.puffPrice])

  const rows = useMemo(
    () => custs.map((c) => ({ c, ...(stats.get(c.email) ?? { n: 0, spent: 0 }) })).sort((a, b) => b.n - a.n || b.spent - a.spent),
    [custs, stats],
  )

  const toggle = async (c: Cust) => {
    let reason: string | undefined
    if (!c.is_blocked) {
      const r = window.prompt(`Block ${c.full_name} (${c.customer_code})? Enter a reason (optional). They will not be able to order or pay.`)
      if (r === null) return
      reason = r.trim()
    }
    setBusy(c.id)
    try {
      await setCustomerBlocked(c.id, !c.is_blocked, reason)
      toast('success', c.is_blocked ? `${c.customer_code} unblocked.` : `${c.customer_code} blocked.`)
      await load()
    } catch (e) {
      console.error(e)
      toast('error', 'Could not update this customer.')
    } finally { setBusy(null) }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Customers</h1>
        <p className="text-ink/70">{rows.length} {rows.length === 1 ? 'customer has' : 'customers have'} ordered.</p>
      </div>
      <Card className="divide-y divide-ink/10 overflow-hidden">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-ink/70">No customers yet.</p>}
        {rows.map(({ c, n, spent }) => (
          <div key={c.id} className="flex flex-wrap items-center gap-4 p-4 transition hover:bg-yellow-light/30">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red font-display font-semibold text-white">{(c.full_name.trim()[0] ?? '?').toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.full_name || 'Unnamed'} <span className="ml-1 text-xs font-bold tracking-wider text-ink/70">{c.customer_code}</span></p>
              <p className="truncate text-sm text-ink/70">{c.phone} · {c.email}</p>
              {c.is_blocked && <p className="text-xs font-semibold text-red">Blocked{c.blocked_reason ? `: ${c.blocked_reason}` : ''}</p>}
            </div>
            <div className="text-right"><p className="font-semibold">{n} {n === 1 ? 'order' : 'orders'}</p><p className="text-sm text-ink/70">{naira(spent)} paid</p></div>
            <Button variant={c.is_blocked ? 'secondary' : 'ghost'} size="sm" loading={busy === c.id} onClick={() => toggle(c)}>
              {c.is_blocked ? <><CheckCircle2 className="size-4" />Unblock</> : <><Ban className="size-4" />Block</>}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  )
}