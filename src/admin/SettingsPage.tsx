import { useEffect, useState } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { Button, cx } from '../components/ui'
import { BATCHES } from '../data'
import { useAdmin, type BatchKey, type DeliverySlot } from './AdminApp'
import { Card, Toggle } from './ui'
import { type Settings } from './data'

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

/* Shell: the form only mounts once the real values have loaded, so Save can
   never overwrite your settings with the closed defaults. */
export default function SettingsPage() {
  const { settingsLoaded, reload } = useAdmin()
  if (!settingsLoaded) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <p className="text-ink/70">Loading settings…</p>
        <Button className="mt-4" variant="secondary" size="md" onClick={() => reload()}>Retry</Button>
      </div>
    )
  }
  return <SettingsForm />
}

function SettingsForm() {
  const { settings, slots, zoboProducts, saveSettings, saveSlots, saveZoboPrices } = useAdmin()

  const basePrices = Object.fromEntries(zoboProducts.map((p) => [String(p.id), p.price])) as Record<string, number>

  const [d, setD] = useState<Settings>(settings)
  const [ds, setDs] = useState<DeliverySlot[]>(slots)
  const [dz, setDz] = useState<Record<string, number>>(basePrices)
  const [newSlot, setNewSlot] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // After a successful save the context reloads from Supabase; pick up the fresh values
  // (new slots get their real ids). A failed save does not reload, so edits are kept.
  useEffect(() => { setD(settings) }, [settings])
  useEffect(() => { setDs(slots) }, [slots])
  useEffect(() => { setDz(Object.fromEntries(zoboProducts.map((p) => [String(p.id), p.price]))) }, [zoboProducts])

  const settingsDirty = JSON.stringify(d) !== JSON.stringify(settings)
  const slotsDirty = JSON.stringify(ds) !== JSON.stringify(slots)
  const zoboDirty = JSON.stringify(dz) !== JSON.stringify(basePrices)
  const dirty = settingsDirty || slotsDirty || zoboDirty

  const up = (p: Partial<Settings>) => setD((x) => ({ ...x, ...p }))

  const addSlot = (day: BatchKey) => {
    const v = (newSlot[day] ?? '').trim()
    if (!v || ds.some((s) => s.batch === day && s.label.toLowerCase() === v.toLowerCase())) return
    setDs((x) => [...x, { batch: day, label: v, active: true }])
    setNewSlot((n) => ({ ...n, [day]: '' }))
  }
  const removeSlot = (s: DeliverySlot) => setDs((x) => x.filter((y) => y !== s))
  const toggleSlot = (s: DeliverySlot, active: boolean) => setDs((x) => x.map((y) => (y === s ? { ...y, active } : y)))

  const discard = () => { setD(settings); setDs(slots); setDz(basePrices) }

  const save = async () => {
    setSaving(true)
    try {
      // Only the parts that changed are written. The drafts are captured here, so the
      // reload after each save cannot discard the edits still waiting to be saved.
      if (settingsDirty) await saveSettings(d)
      if (slotsDirty) await saveSlots(ds)
      if (zoboDirty) await saveZoboPrices(dz)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28">
      <div><h1 className="text-3xl font-semibold sm:text-4xl">Settings</h1><p className="text-ink/70">Control ordering, availability and delivery.</p></div>

      <Block title="Ordering" desc="Open or close each batch and set its cutoff time.">
        {BATCHES.map((b) => (
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

      <Block title="Menu and capacity" desc="Zobo availability, prices and portion limits.">
        <Row label="Zobo available" hint="Partner: Bliss Blend. Shown only when on."><Toggle on={d.zobo} onChange={(v) => up({ zobo: v })} label="Zobo available" /></Row>
        {zoboProducts.map((p) => (
          <Row key={String(p.id)} label={`${p.name} price`} hint="Per bottle">
            <div className={cx(!d.zobo && 'opacity-40')}>
              <Num label={`${p.name} price`} prefix="₦" value={dz[String(p.id)] ?? p.price} onChange={(n) => setDz((x) => ({ ...x, [String(p.id)]: n }))} />
            </div>
          </Row>
        ))}
        {zoboProducts.length === 0 && <Row label="Zobo price" hint="No Zobo products found in the products table"><span className="text-sm font-medium text-red">Nothing to price</span></Row>}
        <Row label="Max portions per batch" hint={d.maxOn ? 'Shows "Sold out" when reached. Applies to every batch.' : 'No limit'}>
          <div className="flex items-center gap-3"><div className={cx(!d.maxOn && 'opacity-40')}><Num label="Max portions" value={d.max} onChange={(n) => up({ max: n })} /></div><Toggle on={d.maxOn} onChange={(v) => up({ maxOn: v })} label="Limit portions" /></div>
        </Row>
      </Block>

      <Block title="Delivery" desc="Default fees and the time slots customers can pick for each batch.">
        <Row label="On-campus fee"><Num label="On-campus fee" prefix="₦" value={d.feeOn} onChange={(n) => up({ feeOn: n })} /></Row>
        <Row label="Off-campus fee" hint="Final fee is confirmed per order"><Num label="Off-campus fee" prefix="₦" value={d.feeOff} onChange={(n) => up({ feeOff: n })} /></Row>

        {BATCHES.map((b) => {
          const mine = ds.filter((s) => s.batch === b.id)
          const anyActive = mine.some((s) => s.active)
          return (
            <div key={b.id} className="border-t border-ink/10 pt-3.5 mt-3.5">
              <p className="font-semibold">{b.day} delivery slots</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {mine.map((s) => (
                  <span key={`${s.id ?? 'new'}-${s.label}`} className={cx('inline-flex items-center gap-1 rounded-full bg-yellow-light pl-4 text-sm font-semibold', !s.active && 'opacity-50')}>
                    {s.label}
                    <Toggle on={s.active} onChange={(v) => toggleSlot(s, v)} label={`${b.day} ${s.label} active`} />
                    <button aria-label={`Remove ${s.label}`} onClick={() => removeSlot(s)} className="grid size-11 place-items-center rounded-full hover:bg-red hover:text-white"><X className="size-3.5" /></button>
                  </span>
                ))}
                {!anyActive && <p className="text-sm font-medium text-red">Add at least one active slot so customers can choose a time.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  aria-label={`New ${b.day} slot`}
                  value={newSlot[b.id] ?? ''}
                  onChange={(e) => setNewSlot((n) => ({ ...n, [b.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addSlot(b.id)}
                  placeholder="e.g. 5:15pm"
                  className="h-11 w-40 rounded-2xl border-2 border-yellow-light bg-white px-4 outline-none focus:border-yellow-dark"
                />
                <Button variant="secondary" size="md" onClick={() => addSlot(b.id)}><Plus className="size-4" />Add slot</Button>
              </div>
            </div>
          )
        })}
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