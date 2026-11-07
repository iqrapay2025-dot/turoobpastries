import { useState } from 'react'
import { Search } from 'lucide-react'
import { useApp, type Order } from '../store'
import { Badge, Button, Field, Notice, Tracker } from '../components/ui'
import { stepsFor } from './Confirmation'
import { naira } from '../data'
import { trackOrder } from '../lib/supabase'

const norm = (s: string) => s.replace(/\D/g, '').replace(/^234/, '0')
export default function Status() {
  const { go, toast } = useApp()
  const [num, setNum] = useState('')
  const [phone, setPhone] = useState('')
  const [res, setRes] = useState<Order | 'none' | null>(null)
  const [loading, setLoading] = useState(false)
  const find = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setRes(null)
    try {
      const data = await trackOrder(num.trim(), phone.trim())
      if (data) {
        const mapped: Order = {
          number: data.order_number || data.id, name: data.customer_name, phone: data.customer_phone,
          email: data.customer_email,
          items: data.order_items?.map((oi: any) => ({ id: oi.product_id, name: oi.product_name, qty: oi.quantity, price: oi.unit_price })) || [],
          mode: data.fulfilment_mode || 'pickup', zone: data.delivery_zone || 'on', address: data.delivery_address || '',
          landmark: data.delivery_landmark || '', slot: data.delivery_slot || '', notes: data.order_notes || '',
          subtotal: data.subtotal || 0, fee: data.delivery_fee || 0, total: data.total_amount || 0,
          status: data.order_status === 'paid' ? 3 : data.order_status === 'preparing' ? 2 : data.order_status === 'awaiting_fee' ? 1 : 0,
          feeConfirmed: data.fee_status === 'confirmed' || data.fee_status === 'accepted', batch: data.batch_day || 'fri',
        }
        setRes(mapped)
      } else { setRes('none') }
    } catch (e: any) { toast('error', e.message || 'Failed to find order'); setRes('none') } finally { setLoading(false) }
  }
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-4xl font-semibold sm:text-5xl">Track your order</h1>
      <p className="mt-2 text-ink-soft">Enter your order number and phone number.</p>
      <form onSubmit={find} className="mt-6 space-y-4 rounded-[28px] bg-white p-6 shadow-soft">
        <Field label="Order number" value={num} onChange={(e) => setNum(e.target.value)} placeholder="TRB-1042" required />
        <Field label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0801 234 5678" required />
        <Button full size="lg" type="submit" loading={loading}><Search className="size-4" />Check status</Button>
        <p className="text-center text-xs text-ink/70">Use your order number and phone number to track.</p>
      </form>
      {res === 'none' && <div className="mt-5"><Notice tone="error" title="We could not find that order">Check your order number and phone number, then try again. Still stuck? Message us on WhatsApp.</Notice></div>}
      {res && res !== 'none' && (
        <section className="pop-in mt-5 rounded-[28px] bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wider text-red">Order</p><p className="font-display text-2xl font-semibold">{res.number}</p><p className="text-sm text-ink/70">{res.items.reduce((a, i) => a + i.qty, 0)} items · {naira(res.total)}</p></div>
            <div className="flex flex-col items-end gap-2"><Badge tone="paid">Paid</Badge><Badge tone="preparing">{stepsFor(res.mode)[res.status]}</Badge></div>
          </div>
          <Tracker steps={stepsFor(res.mode)} current={res.status} />
        </section>
      )}
    </main>
  )
}
