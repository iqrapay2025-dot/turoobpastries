import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '../components/ui'
import { useAdmin } from './adminContext'

// Pickup queue board: put it on a tablet or screen at the pickup point.
// Customers watch for their order number to move into "Ready now".
export default function Queue() {
  const { orders, reload } = useAdmin()
  const [full, setFull] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // Orders update live already; this is a safety refresh for flaky connections.
  useEffect(() => {
    const t = setInterval(() => { void reload() }, 30000)
    return () => clearInterval(t)
  }, [reload])

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void box.current?.requestFullscreen?.().catch(() => {})
  }

  const pickup = orders.filter((o) => o.mode === 'pickup' && o.paid)
  const ready = pickup.filter((o) => o.stage === 'out')
  const prep = pickup.filter((o) => o.stage === 'paid' || o.stage === 'preparing')

  const Chip = ({ no, tone }: { no: string; tone: 'ready' | 'prep' }) => (
    <span className={tone === 'ready'
      ? 'rounded-2xl bg-green-600 px-5 py-3 font-display text-3xl font-semibold text-white sm:text-5xl'
      : 'rounded-2xl bg-yellow-light px-4 py-2 font-display text-2xl font-semibold text-ink sm:text-3xl'}>{no}</span>
  )

  return (
    <div ref={box} className={full ? 'min-h-screen overflow-auto bg-cream p-6' : ''}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pickup queue</h1>
        <Button variant="secondary" size="sm" onClick={toggle}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}{full ? 'Exit full screen' : 'Full screen'}</Button>
      </div>
      <section className="rounded-[28px] bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-xl font-semibold text-green-700">Ready now</h2>
        {ready.length ? <div className="flex flex-wrap gap-3">{ready.map((o) => <Chip key={o.no} no={o.no} tone="ready" />)}</div> : <p className="text-ink-soft">Nothing ready yet.</p>}
      </section>
      <section className="mt-5 rounded-[28px] bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-xl font-semibold">Being prepared</h2>
        {prep.length ? <div className="flex flex-wrap gap-3">{prep.map((o) => <Chip key={o.no} no={o.no} tone="prep" />)}</div> : <p className="text-ink-soft">No orders in preparation.</p>}
      </section>
    </div>
  )
}