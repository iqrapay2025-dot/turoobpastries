import { ShoppingBag } from 'lucide-react'
import { useApp } from '../store'
import { naira } from '../data'
import { Button, EmptyState } from './ui'

// Cart lines use qty/price. Saved orders from the database use quantity/unit_price/line_total.
// Accept both so the summary never shows a blank quantity or NaN.
type Line = { id?: string; name: string; qty?: number; quantity?: number; price?: number; unit_price?: number; line_total?: number }

export function Lines({ items }: { items: Line[] }) {
  return (
    <ul className="divide-y divide-yellow-light">
      {items.map((i, idx) => {
        const qty = Number(i.qty ?? i.quantity ?? 0)
        const amount = i.line_total != null ? Number(i.line_total) : qty * Number(i.price ?? i.unit_price ?? 0)
        return (
          <li key={i.id ?? `${i.name}-${idx}`} className="flex justify-between gap-3 py-2.5 text-sm">
            <span><b className="font-semibold">{qty}×</b> {i.name}</span>
            <span className="font-semibold">{naira(amount)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * fee:
 *  - number          -> the confirmed fee
 *  - 'pickup'        -> "Free (pickup)"
 *  - 'tbc'           -> delivery, fee not set yet, no estimate shown
 *  - { estimate }    -> delivery, showing an estimate that the team will confirm
 *  - 'none'          -> fulfilment not chosen yet (cart panel)
 */
export type FeeProp = number | 'pickup' | 'tbc' | 'none' | { estimate: number }

export function Totals({ subtotal, fee }: { subtotal: number; fee: FeeProp }) {
  const isEstimate = typeof fee === 'object'
  const feeText =
    typeof fee === 'number' ? naira(fee)
    : typeof fee === 'object' ? `${naira(fee.estimate)} (estimate)`
    : fee === 'pickup' ? 'Free (pickup)'
    : fee === 'tbc' ? 'To be confirmed'
    : 'Calculated at checkout'
  const feeAmount = typeof fee === 'number' ? fee : typeof fee === 'object' ? fee.estimate : 0
  const label = typeof fee === 'number' || fee === 'pickup' ? 'Total' : isEstimate ? 'Estimated total' : 'Total so far'

  return (
    <dl className="space-y-2 border-t-2 border-dashed border-yellow pt-4 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{naira(subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Delivery fee</dt><dd className="font-semibold">{feeText}</dd></div>
      <div className="flex items-end justify-between pt-2">
        <dt className="font-display text-lg font-semibold">{label}</dt>
        <dd className="font-display text-3xl font-semibold text-red">{naira(subtotal + feeAmount)}</dd>
      </div>
    </dl>
  )
}

export function CartPanel({ cta }: { cta?: boolean }) {
  const { cart, products, subtotal, count, go, closed } = useApp()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Line[] = products.filter((p: any) => cart[p.id]).map((p: any) => ({ id: p.id, name: p.name, qty: cart[p.id], price: Number(p.price) }))
  return (
    <aside className="rounded-[28px] bg-white p-6 shadow-soft">
      <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold"><ShoppingBag className="size-5 text-red" />Your order</h3>
      {count === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-7" />} title="Your cart is empty">Add some hot puff-puff to get started.</EmptyState>
      ) : (
        <>
          <Lines items={items} />
          <div className="mt-3"><Totals subtotal={subtotal} fee="none" /></div>
          {cta && <Button full size="lg" className="mt-5" disabled={closed} onClick={() => go('#/checkout')}>{closed ? 'Orders closed' : 'Checkout'}</Button>}
        </>
      )}
    </aside>
  )
}