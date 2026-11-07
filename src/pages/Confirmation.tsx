import { Mail, MapPin, Clock } from 'lucide-react'
import { useApp, type Order } from '../store'
import { Button, Sparkle, Tracker, Notice } from '../components/ui'
import { Lines, Totals } from '../components/Summary'
import { BATCHES } from '../data'
import { WA, WhatsAppIcon } from '../components/Layout'
import { getOrderByToken } from '../lib/supabase'

export const stepsFor = (m: Order['mode']) => ['Received', 'Preparing', m === 'delivery' ? 'Out for delivery' : 'Ready for pickup', 'Completed']

export function PuffIllustration() {
  return (
    <div className="relative mx-auto size-36">
      <Sparkle className="-left-2 top-2 size-6" /><Sparkle className="-right-2 top-10 size-5 [animation-delay:1s]" />
      <svg viewBox="0 0 120 120" className="size-full" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="#FFE9A0" />
        <circle cx="42" cy="72" r="22" fill="#FFC107" /><circle cx="78" cy="72" r="22" fill="#C79100" opacity=".9" /><circle cx="60" cy="46" r="24" fill="#FFC107" />
        <circle cx="52" cy="40" r="5" fill="#FFE9A0" opacity=".9" /><circle cx="35" cy="66" r="4" fill="#FFE9A0" opacity=".8" /><circle cx="71" cy="66" r="3" fill="#FFE9A0" />
        <circle cx="94" cy="24" r="14" fill="#D62828" /><path d="M87 24l5 5 9-10" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function Confirmation() {
  const { order: o, go } = useApp()
  if (!o || !o.feeConfirmed) return <main className="mx-auto max-w-lg px-4 py-16 text-center"><h1 className="text-3xl font-semibold">No recent order</h1><p className="mt-2 text-ink-soft">Place an order or look one up with your order number.</p><div className="mt-5 flex justify-center gap-3"><Button onClick={() => go('#/order')}>Order now</Button><Button variant="secondary" onClick={() => go('#/status')}>Track order</Button></div></main>
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <div className="rounded-4xl bg-white p-6 text-center shadow-pop sm:p-10">
        <PuffIllustration />
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Order confirmed!</h1>
        <p className="mt-2 text-ink-soft">Thank you, {o.name.split(' ')[0]}. Your puff-puff is on its way to the fryer.</p>
        <div className="mx-auto mt-6 inline-block rounded-2xl bg-yellow px-8 py-4"><p className="text-xs font-bold uppercase tracking-wider">Order number</p><p className="font-display text-3xl font-semibold tracking-wide">{o.number}</p></div>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-yellow-light/70 px-4 py-2 text-sm font-medium"><Mail className="size-4 text-red" />A confirmation email has been sent to {o.email}</p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-[28px] bg-white p-6 shadow-soft">
          <h2 className="mb-3 text-xl font-semibold">Order summary</h2>
          <Lines items={o.items} /><div className="mt-3"><Totals subtotal={o.subtotal} fee={o.mode === 'delivery' ? o.fee : null} /></div>
        </section>
        <section className="rounded-[28px] bg-white p-6 shadow-soft">
          <h2 className="mb-3 text-xl font-semibold">{o.mode === 'delivery' ? 'Delivery details' : 'Pickup details'}</h2>
          <div className="space-y-4 text-sm">
            <p className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-red" /><span>{o.mode === 'delivery' ? <>{o.address}{o.landmark && <span className="block text-ink/70">Near {o.landmark}</span>}</> : <>Central Mosque, University of Ilorin<span className="block text-ink/70">{o.batch === 'fri' ? 'Collect after Jumah' : `Collect on ${BATCHES.find((b) => b.id === o.batch)!.day}`}</span></>}</span></p>
            <p className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-red" /><span>{o.mode === 'delivery' ? `${BATCHES.find((b) => b.id === o.batch)!.day}, time slot ${o.slot}` : (o.batch === 'fri' ? 'Friday, from about 2:30pm' : `${BATCHES.find((b) => b.id === o.batch)!.day} batch, exact pickup time to be confirmed`)}</span></p>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[28px] bg-white p-6 shadow-soft">
        <h2 className="mb-5 text-xl font-semibold">Order status</h2>
        <Tracker steps={stepsFor(o.mode)} current={o.status} />
      </section>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a href={WA} target="_blank" rel="noreferrer"><Button size="lg" variant="dark" full><WhatsAppIcon className="size-5" />Chat with us on WhatsApp</Button></a>
        <Button size="lg" variant="secondary" onClick={() => go('#/')}>Back home</Button>
      </div>
    </main>
  )
}
