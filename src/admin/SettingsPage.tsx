import { useEffect, useState } from 'react'
import { X, Plus, Save, Loader2 } from 'lucide-react'
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

const pad = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const to12 = (v: string) => {
  const [h, m] = v.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}
// Database times come back as HH:MM:SS; the pickers work in HH:MM.
const hhmm = (v?: string) => (v || '').slice(0, 5)
const validTime = (v?: string) => /^\d{2}:\d{2}$/.test(hhmm(v))

function TimeField({ value, onChange, label, fallback }: { value: string; onChange: (v: string) => void; label: string; fallback: string }) {
  const v = hhmm(value)
  const [h, m] = (validTime(v) ? v : fallback).split(':')
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5))
  if (!minutes.includes(m)) { minutes.push(m); minutes.sort() }
  const sel = 'h-11 rounded-2xl border-2 border-yellow-light bg-white px-2 font-semibold text-ink outline-none focus:border-yellow-dark'
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <select aria-label={`${label} hour`} value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className={sel}>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="font-bold">:</span>
      <select aria-label={`${label} minute`} value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className={sel}>
        {minutes.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="hidden w-[4.5rem] text-xs font-semibold text-ink/70 sm:inline">{to12(`${h}:${m}`)}</span>
    </div>
  )
}

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

  useEffect(() => { setD(settings) }, [settings])
  useEffect(() => { setSl(slotsByDay) }, [slotsByDay])

  const dirty = JSON.stringify(d) !== JSON.stringify(settings) || JSON.stringify(sl) !== JSON.stringify(slotsByDay)
  const up = (p: Partial<Settings>) => setD((x) => ({ ...x, ...p }))

  const cutoffsOk = DAYS.every((b) => validTime(d.cutoff[b.id]))
  const opensOk = DAYS.every((b) => validTime(d.opens?.[b.id]))
  const invalid = !cutoffsOk
    ? 'Set a closing time for every day'
    : !opensOk
      ? 'Set an opening time for every day'
      : d.maxOn && d.max < 1
        ? 'Max portions must be at least 1'
        : ''

  const addSlot = () => {
    const v = slot.trim()
    if (!v || sl[day].some((x) => x.toLowerCase() === v.toLowerCase())) return
    setSl({ ...sl, [day]: [...sl[day], v] })
    setSlot('')
  }
  const removeSlot = (s: string) => setSl({ ...sl, [day]: sl[day].filter((x) => x !== s) })

  const save = async () => {
    if (invalid || saving) return
    setSaving(true)
    try { await saveSettings(d, sl) } finally { setSaving(false) }
  }
  const discard = () => { if (!saving) { setD(settings); setSl(slotsByDay) } }

  const dayName = DAYS.find((x) => x.id === day)!.day

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28">
      <div><h1 className="text-3xl font-semibold sm:text-4xl">Settings</h1><p className="text-ink/70">Control ordering, availability and delivery. Changes apply to the site only after you click Save changes.</p></div>

      <Block title="Ordering" desc="Each batch opens the evening before and closes the morning of the batch day (24-hour times). Use the toggle to open or close a batch manually.">
        {DAYS.map((b) => (
          <div key={b.id} className="border-t border-ink/10 py-4 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{b.day} batch</p>
                <p className="text-sm text-ink/70">{d.open[b.id] ? 'Customers can order' : 'Ordering is closed'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cx('w-14 text-right text-sm font-bold', d.open[b.id] ? 'text-red' : 'text-ink/60')}>{d.open[b.id] ? 'Open' : 'Closed'}</span>
                <Toggle on={d.open[b.id]} onChange={(v) => up({ open: { ...d.open, [b.id]: v } })} label={`${b.day} ordering`} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-sm text-ink/70">
                <span className="w-36">Opens (evening before)</span>
                <TimeField label={`${b.day} opens`} fallback="18:00" value={d.opens?.[b.id] ?? ''} onChange={(v) => up({ opens: { ...(d.opens as Record<DayId, string>), [b.id]: v } })} />
              </div>
              <div className="flex items-center gap-2 text-sm text-ink/70">
                <span className="w-36">Closes (morning of)</span>
                <TimeField label={`${b.day} closes`} fallback="07:00" value={d.cutoff[b.id]} onChange={(v) => up({ cutoff: { ...d.cutoff, [b.id]: v } })} />
              </div>
            </div>
          </div>
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

      <div className={cx('fixed inset-x-0 bottom-0 z-40 p-3 transition-transform lg:left-62.5', dirty || saving ? 'translate-y-0' : 'translate-y-full')}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-full bg-ink p-2 pl-6 text-white shadow-pop">
          <p className="text-sm font-semibold">{saving ? 'Saving your changes…' : invalid || 'You have unsaved changes'}</p>
          <div className="flex gap-2">
            <button type="button" onClick={discard} disabled={saving} className="h-11 rounded-full px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40">Discard</button>
            <button type="button" onClick={save} disabled={saving || !!invalid} className="inline-flex h-11 items-center gap-2 rounded-full bg-red px-5 text-sm font-semibold text-white transition hover:bg-red-dark disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}