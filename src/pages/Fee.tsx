import { useState } from 'react'
import { MapPin, Clock, Truck, Lock } from 'lucide-react'
import { useApp } from '../store'
import { Button, Modal, Notice } from '../components/ui'
import { Lines, Totals } from '../components/Summary'
import { respondToDeliveryFee, paystackInit } from '../lib/supabase'
import { naira } from '../data'

export default function Fee() {
  const { order, go, toast, setOrder } = useApp()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  if (!order || order.mode !== 'delivery') return <main className="mx-auto max-w-lg px-4 py-16 text-center"><h1 className="text-3xl font-semibold">No delivery order to confirm</h1><Button className="mt-5" onClick={() => go('#/order')}>Start an order</Button></main>
  const acceptFee = async () => {
    setLoading(true)
    try {
      await respondToDeliveryFee(order.public_token, true)
      const paystackResult = await paystackInit({ public_token: order.public_token })
      if (paystackResult?.authorization_url) {
        window.location.href = paystackResult.authorization_url
      } else {
        throw new Error('Payment initialization failed')
      }
    } catch (e: any) {
      setLoading(false)
      toast('error', e.message || 'Failed to accept delivery fee')
    }
  }
  const declineFee = async () => {
    setLoading(true)
    try {
      await respondToDeliveryFee(order.public_token, false)
      toast('info', 'Delivery fee declined. Returning to menu.')
      setOrder(null)
      go('#/order')
    } catch (e: any) {
      setLoading(false)
      toast('error', e.message || 'Failed to decline delivery fee')
    }
  }
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-9">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-yellow text-ink"><Truck className="size-9" /></span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-red">Delivery fee confirmed</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">Your delivery fee is <span className="text-red">{naira(order.fee)}</span> for {order.address}</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-light px-4 py-2 font-semibold"><MapPin className="size-4 text-red" />{order.zone === 'on' ? 'On-campus' : 'Off-campus'}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-light px-4 py-2 font-semibold"><Clock className="size-4 text-red" />{order.slot}</span>
        </div>
        <div className="mt-7 rounded-2xl bg-cream p-5 text-left"><Lines items={order.items} /><div className="mt-3"><Totals subtotal={order.subtotal} fee={order.fee} /></div></div>
        <div className="mt-7 space-y-3">
          <Button full size="lg" loading={loading} onClick={acceptFee}><Lock className="size-4" />Accept and pay</Button>
          <Button full variant="secondary" size="lg" onClick={declineFee}>Decline or change address</Button>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Change or decline?">
        <p className="text-ink-soft">You can go back and update your address or switch to pickup. Your cart is saved.</p>
        <div className="mt-5 grid gap-3">
          <Button full onClick={() => { setOpen(false); go('#/checkout') }}>Change address or switch to pickup</Button>
          <Button full variant="secondary" onClick={() => { setOpen(false); toast('info', 'Fee declined. Your cart is still saved.'); go('#/order') }}>Decline and return to menu</Button>
        </div>
      </Modal>
    </main>
  )
}
