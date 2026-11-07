import { ShoppingBag } from 'lucide-react'
import { useApp } from '../store'
import { LINES, naira } from '../data'
import { Button, EmptyState } from './ui'

export function Lines({ items }: { items: { name: string; qty: number; price: number }[] }) {
  return <ul className="divide-y divide-yellow-light">{items.map((i) => <li key={i.name} className="flex justify-between gap-3 py-2.5 text-sm"><span><b className="font-semibold">{i.qty}×</b> {i.name}</span><span className="font-semibold">{naira(i.qty * i.price)}</span></li>)}</ul>
}

export function Totals({ subtotal, fee, pending }: { subtotal: number; fee: number | null; pending?: boolean }) {
  return (
    <dl className="space-y-2 border-t-2 border-dashed border-yellow pt-4 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{naira(subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Delivery fee</dt><dd className="font-semibold">{fee === null ? 'Free (pickup)' : naira(fee) + (pending ? ' (to confirm)' : '')}</dd></div>
      <div className="flex items-end justify-between pt-2"><dt className="font-display text-lg font-semibold">Total</dt><dd className="font-display text-3xl font-semibold text-red">{naira(subtotal + (fee ?? 0))}</dd></div>
    </dl>
  )
}

export function CartItems() {
  return null
}

export function CartPanel({ cta }: { cta?: boolean }) {
  const { cart, subtotal, count, go, closed } = useApp()
  const items = LINES.filter((p) => cart[p.id]).map((p) => ({ name: p.name, qty: cart[p.id], price: p.price }))
  return (
    <aside className="rounded-[28px] bg-white p-6 shadow-soft">
      <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold"><ShoppingBag className="size-5 text-red" />Your order</h3>
      {count === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-7" />} title="Your cart is empty">Add some hot puff-puff to get started.</EmptyState>
      ) : (
        <>
          <Lines items={items} />
          <div className="mt-3"><Totals subtotal={subtotal} fee={null} /></div>
          {cta && <Button full size="lg" className="mt-5" disabled={closed} onClick={() => go('#/checkout')}>{closed ? 'Orders closed' : 'Checkout'}</Button>}
        </>
      )}
    </aside>
  )
}
