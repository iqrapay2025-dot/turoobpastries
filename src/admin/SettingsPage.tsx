import { useEffect, useState } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { Button, cx } from '../components/ui'
import { useAdmin, type SlotsByDay } from './adminContext'
import { Card, Toggle } from './ui'
import { type Settings } from './data'

const DAYS = [
  { id: 'fri', day: 'Friday' },
  { id: 'sat', day: 'Saturday' },
  { id: 'sun', day: 'Sunday' },
] as const
type DayId = (typeof DAYS)[number]['id']

function Block({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <Card className="p-5 sm:p-6"><h2 className="text-xl font-semibold">{title}</h2><p className="mb-4 text-sm text-ink/70">{desc}</p>{children}</Card>
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-t border-ink/10 py-3.5 first:border-0 first:pt-0"><div><p className="font-semibold">{label}</p>{hint && <p className="text-sm text-ink/70">{hint}</p>}</div>{children}</div>
}
function Num({ value, onChange, prefix, label }: { value: number; onChange: (n: number) => void; prefix?: string; label: string }) {
  return (
    <label className="flex items-center gap-1 rounded-2xl border-2 border-yellow-light bg-white px-3 focus-within:border-yellow-dark focus-within:ring-4 focus-within:ring-yellow/30">
      {prefix && <span className="font-bold text-ink/70">{prefix}</span>}
      <input aria-label={label} inputMode="numeric" value={value} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} className="h-11 w-20 bg-transparent text-right font-semibold outline-none" />
    </label>
  )
}

export default function SettingsPage() {
  const { settings, slotsByDay, saveSettings } = useAdmin()
  const [d, setD] = useState<Settings>(settings)
  const [sl, setSl] = useState<SlotsByDay>(slotsByDay)
  const [day, setDay] = useState<DayId>('fri')
  const [slot, setSlot] = useState('')
  const [saving, setSaving] = useState(false)

  // Re-sync whenever fresh values arrive from the database (after load or save).
  useEffect(() => { setD(settings) }, [settings])
  useEffect(() => { setSl(slotsByDay) }, [slotsByDay])

  const dirty = JSON.stringify(d) !== JSON.stringify(settings) || JSON.stringify(sl) !== JSON.stringify(slotsByDay)
  const up = (p: Partial<Settings>) => setD((x) => ({ ...x, ...p }))

  const addSlot = () => {
    const v = slot.trim()
    if (!v || sl[day].includes(v)) return
    setSl({ ...sl, [day]: [...sl[day], v] })
    setSlot('')
  }
  const removeSlot = (s: string) => setSl({ ...sl, [day]: sl[day].filter((x) => x !== s) })

  const save = async () => {
    setSaving(true)
    try { await saveSettings(d, sl) } finally { setSaving(false) }
  }
  const discard = () => { setD(settings); setSl(slotsByDay) }

  const dayName = DAYS.find((x) => x.id === day)!.day

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28">
      <div><h1 className="text-3xl font-semibold sm:text-4xl">Settings</h1><p className="text-ink/70">Control ordering, availability and delivery.</p></div>

      <Block title="Ordering" desc="Open or close each batch and set its cutoff time. The cutoff is a time on the day of the batch.">
        {DAYS.map((b) => (
          <Row key={b.id} label={`${b.day} batch`} hint={d.open[b.id] ? 'Customers can order' : 'Ordering is closed'}>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-ink/70"><span className="hidden sm:inline">Cutoff</span>
                <input type="time" aria-label={`${b.day} cutoff`} value={d.cutoff[b.id]} onChange={(e) => up({ cutoff: { ...d.cutoff, [b.id]: e.target.value } })} className="h-11 rounded-2xl border-2 border-yellow-light bg-white px-3 font-semibold text-ink outline-none focus:border-yellow-dark" />
              </label>
              <Toggle on={d.open[b.id]} onChange={(v) => up({ open: { ...d.open, [b.id]: v } })} label={`${b.day} ordering`} />
            </div>
          </Row>
        ))}
      </Block>

      <Block title="Menu and capacity" desc="Zobo availability and portion limits.">
        <Row label="Zobo available" hint="Partner: Bliss Blend. Shown only when on."><Toggle on={d.zobo} onChange={(v) => up({ zobo: v })} label="Zobo available" /></Row>
        <Row label="Zobo prices" hint="Small and large sizes. Change these in the Supabase products table for now.">
          <span className="text-sm font-semibold text-ink/70">Not editable here</span>
        </Row>
        <Row label="Max portions per batch" hint={d.maxOn ? 'Shows "Sold out" when reached. Applies to every batch day.' : 'No limit'}>
          <div className="flex items-center gap-3"><div className={cx(!d.maxOn && 'opacity-40')}><Num label="Max portions" value={d.max} onChange={(n) => up({ max: n })} /></div><Toggle on={d.maxOn} onChange={(v) => up({ maxOn: v })} label="Limit portions" /></div>
        </Row>
      </Block>

      <Block title="Delivery" desc="Default fees and the time slots customers can pick for each day.">
        <Row label="On-campus fee"><Num label="On-campus fee" prefix="₦" value={d.feeOn} onChange={(n) => up({ feeOn: n })} /></Row>
        <Row label="Off-campus fee" hint="Final fee is confirmed per order"><Num label="Off-campus fee" prefix="₦" value={d.feeOff} onChange={(n) => up({ feeOff: n })} /></Row>
        <div className="border-t border-ink/10 pt-3.5">
          <p className="font-semibold">Delivery time slots</p>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Choose a day">
            {DAYS.map((x) => (
              <button key={x.id} role="tab" aria-selected={day === x.id} onClick={() => setDay(x.id)} className={cx('min-h-11 rounded-full px-4 text-sm font-semibold transition', day === x.id ? 'bg-red text-white' : 'bg-yellow-light hover:bg-yellow')}>{x.day}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sl[day].map((s) => <span key={s} className="inline-flex items-center rounded-full bg-yellow-light pl-4 text-sm font-semibold">{s}<button aria-label={`Remove ${s} from ${dayName}`} onClick={() => removeSlot(s)} className="grid size-11 place-items-center rounded-full hover:bg-red hover:text-white"><X className="size-3.5" /></button></span>)}
            {sl[day].length === 0 && <p className="text-sm font-medium text-red">No slots for {dayName}. Add at least one so customers can choose a time.</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={slot} onChange={(e) => setSlot(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSlot()} placeholder="e.g. 5:15pm" className="h-11 w-40 rounded-2xl border-2 border-yellow-light bg-white px-4 outline-none focus:border-yellow-dark" />
            <Button variant="secondary" size="md" onClick={addSlot}><Plus className="size-4" />Add slot</Button>
          </div>
        </div>
      </Block>

      <div className={cx('fixed inset-x-0 bottom-0 z-40 p-3 transition-transform lg:left-62.5', dirty ? 'translate-y-0' : 'translate-y-full')}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-full bg-ink p-2 pl-6 text-white shadow-pop">
          <p className="text-sm font-semibold">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white! hover:bg-white/10!" onClick={discard}>Discard</Button>
            <Button size="sm" loading={saving} onClick={save}><Save className="size-4" />Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}