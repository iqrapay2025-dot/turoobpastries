import { Clock, MapPin, Lock, Flame, Droplets } from 'lucide-react'
import { useApp, type BatchId } from '../store'
import { Badge, Button, Stepper, cx } from './ui'
import { naira } from '../data'

/* ------------------------------------------------------------- helpers */
const ID_BY_DOW: Record<number, BatchId> = { 5: 'fri', 6: 'sat', 0: 'sun' }

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  })

/* ----------------------------------------------------------- countdown */
// Pass `to` to count down to a specific time. With no argument it uses the store target.
export function useCountdown(to?: Date | null) {
  const { target, now } = useApp()
  const t = to === undefined ? target : to
  if (!t) return { d: 0, h: 0, m: 0, s: 0 }
  let s = Math.max(0, Math.floor((t.getTime() - now.getTime()) / 1000))
  const d = Math.floor(s / 86400); s %= 86400
  const h = Math.floor(s / 3600); s %= 3600
  return { d, h, m: Math.floor(s / 60), s: s % 60 }
}

export function Countdown({ dark, to }: { dark?: boolean; to?: Date | null }) {
  const t = useCountdown(to)
  const cells: [number, string][] = [[t.d, 'days'], [t.h, 'hrs'], [t.m, 'min'], [t.s, 'sec']]
  return (
    <div className="flex gap-2" role="timer">
      {cells.map(([n, l]) => (
        <div key={l} className={cx('min-w-14.5 rounded-2xl px-3 py-2 text-center', dark ? 'bg-white/10' : 'bg-white shadow-soft')}>
          <div className={cx('font-display text-2xl font-semibold tabular-nums leading-none', dark ? 'text-yellow' : 'text-red')}>{String(n).padStart(2, '0')}</div>
          <div className={cx('mt-1 text-[10px] font-bold uppercase tracking-wider', dark ? 'text-white/60' : 'text-ink/70')}>{l}</div>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------- batch banner */
function BannerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="on-dark relative overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-pop sm:p-7">
      {children}
    </div>
  )
}

export function BatchBanner() {
  const { closed, currentBatch: b, batchRows, batchError, settings, now } = useApp()

  if (batchError) {
    return <BannerShell><p className="font-semibold text-yellow">Couldn’t check ordering status. Please refresh the page.</p></BannerShell>
  }
  if (batchRows.length === 0) {
    return <BannerShell><p className="text-white/80">Checking the next batch…</p></BannerShell>
  }
  if (!b) {
    return <BannerShell><p className="font-semibold text-yellow">This day isn’t available for ordering.</p></BannerShell>
  }

  const opensAt = new Date(b.opens_at)
  const comingSoon = !b.is_enabled
  const soldOut = b.is_sold_out
  const notYetOpen = b.is_enabled && now < opensAt
  const pickup = settings?.pickup_location ?? 'Central Mosque, Unilorin'

  const badge = comingSoon
    ? <Badge tone="soon">Coming soon</Badge>
    : soldOut
      ? <Badge tone="soldout">Sold out</Badge>
      : closed
        ? <Badge tone="closed">Orders closed</Badge>
        : <Badge tone="open">Orders open</Badge>

  // What the countdown points at, if anything.
  let countdownTo: Date | null = null
  let countdownLabel = ''
  if (!closed) {
    countdownTo = new Date(b.cutoff_at)
    countdownLabel = 'Orders close in'
  } else if (notYetOpen && !soldOut) {
    countdownTo = opensAt
    countdownLabel = 'Orders open in'
  }

  let closedMessage = ''
  if (closed) {
    if (comingSoon) closedMessage = b.note || 'This batch is not open for orders yet.'
    else if (soldOut) closedMessage = 'Sold out for this batch. See you next time!'
    else if (notYetOpen) closedMessage = `Orders open ${fmt(b.opens_at)} and close ${fmt(b.cutoff_at)}.`
    else closedMessage = 'Orders are closed for this batch.'
  }

  return (
    <BannerShell>
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-yellow">Next batch</span>
            {badge}
          </div>
          <h3 className="text-2xl font-semibold sm:text-3xl">{b.label} fry-up</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            {b.serving_time_label && <span className="flex items-center gap-1.5"><Clock className="size-4 text-yellow" />{b.serving_time_label}</span>}
            <span className="flex items-center gap-1.5"><MapPin className="size-4 text-yellow" />{pickup}</span>
          </p>
          {!closed && b.portions_left !== null && (
            <p className="mt-2 text-sm font-semibold text-yellow">{b.portions_left} portions left</p>
          )}
        </div>
        {countdownTo && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">{countdownLabel}</p>
            <Countdown dark to={countdownTo} />
          </div>
        )}
      </div>
      {closed && <p className="relative mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-yellow">{closedMessage}</p>}
    </BannerShell>
  )
}

/* ------------------------------------------------------------ product card */
// `p` is a product row from Supabase (mapped with toProduct): name, desc, price, img, unit,
// partner, available, counts_toward_limit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProductCard({ p, preview }: { p: any; preview?: boolean }) {
  const { cart, setQty, closed, currentBatch, go } = useApp()
  const unavailable = p.available === false || p.is_available === false
  const soldOut = !!p.counts_toward_limit && !!currentBatch?.is_sold_out
  const disabled = unavailable || soldOut || closed
  const price = Number(p.price)
  const q = cart[p.id] || 0
  const lineTotal = q * price
  const isDrink = !p.counts_toward_limit
  const chips = isDrink ? [1, 2, 4] : [5, 10, 20]

  return (
    <article className={cx('group flex flex-col overflow-hidden rounded-[28px] bg-white shadow-soft transition', !disabled && 'hover:-translate-y-1 hover:shadow-pop', (unavailable || soldOut) && 'opacity-90')}>
      <div className="relative aspect-4/3 overflow-hidden bg-yellow-light">
        <img src={p.img} alt={p.name} loading="lazy" className={cx('size-full object-cover transition duration-500 group-hover:scale-105', (unavailable || soldOut) && 'grayscale')} />
        <div className="absolute left-3 top-3 flex gap-2">
          {p.tag && !disabled && <span className="rounded-full bg-yellow px-3 py-1 text-xs font-bold">{p.tag}</span>}
          {soldOut && <Badge tone="soldout">Sold out</Badge>}
          {unavailable && <Badge tone="soon">Not available this week</Badge>}
        </div>
        {p.partner && <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-white">Partner: {p.partner}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold leading-snug">{p.name}</h3>
          <div className="shrink-0 text-right">
            <p className="font-display text-xl font-semibold text-red">{naira(price)}</p>
            <p className="text-xs text-ink/70">per {p.unit}</p>
          </div>
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{p.desc}</p>
        {preview ? (
          <Button variant="secondary" disabled={unavailable || soldOut} className="mt-4" onClick={() => go('#/order')}>
            {unavailable ? 'Not available' : soldOut ? 'Sold out' : 'Add to order'}
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            {!disabled && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {chips.map((n) => (
                  <button key={n} onClick={() => setQty(p.id, n)} className={cx('min-h-11 shrink-0 rounded-full border-2 px-4 text-sm font-semibold transition', q === n ? 'border-red bg-red text-white' : 'border-yellow bg-yellow-light/50 hover:bg-yellow')}>{n}{isDrink ? '' : ' pcs'}</button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Stepper value={q} onChange={(n) => setQty(p.id, n)} disabled={disabled} />
              {lineTotal > 0 && <span className="font-display text-lg font-semibold">{naira(lineTotal)}</span>}
            </div>
            {soldOut && <p className="flex items-center gap-1.5 text-sm font-semibold text-ink/70"><Lock className="size-4" />Max portions reached for this batch</p>}
          </div>
        )}
      </div>
    </article>
  )
}

export const PepperIcon = Flame
export const DropIcon = Droplets

/* ------------------------------------------------------------ batch picker */
export function BatchPicker({ compact }: { compact?: boolean }) {
  const { batch, setBatch, batchRows, batchError, batchOpen } = useApp()

  if (batchError) return <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-red-dark shadow-soft">Couldn’t load the batch days. Please refresh the page.</p>
    const ORDER: Record<BatchId, number> = { fri: 0, sat: 1, sun: 2 }
  const tabs = batchRows
    .filter((r) => ID_BY_DOW[r.day_of_week])
    .sort((a, b) => ORDER[ID_BY_DOW[a.day_of_week]] - ORDER[ID_BY_DOW[b.day_of_week]])
  if (tabs.length === 0) return <p className="text-sm text-ink-soft">Checking batch days…</p>
  if (tabs.length === 0) return <p className="text-sm text-ink-soft">Checking batch days…</p>

  const cols = tabs.length === 1 ? 'sm:grid-cols-1' : tabs.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'

  return (
    <div className={cx('grid gap-3', compact ? 'grid-cols-3' : cols)} role="tablist" aria-label="Batch">
      {tabs.map((r) => {
        const id = ID_BY_DOW[r.day_of_week]
        const open = batchOpen(id)
        const sel = batch === id
        const soon = !r.is_enabled
        return (
          <button key={r.batch_day_id} role="tab" aria-selected={sel} onClick={() => setBatch(id)}
            className={cx('rounded-3xl border-2 p-4 text-left transition duration-200 hover:-translate-y-0.5', sel ? 'border-red bg-white shadow-pop' : 'border-transparent bg-white shadow-soft hover:border-yellow', !open && 'opacity-80')}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xl font-semibold">{r.label}</span>
              {soon ? <Badge tone="soon">Coming soon</Badge> : open ? <Badge tone="open">Open</Badge> : <Badge tone="closed">Closed</Badge>}
            </div>
            {r.serving_time_label && <p className="mt-2 text-sm text-ink-soft">{r.serving_time_label}</p>}
            {!soon && (
              <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-red">
                <Clock className="mt-0.5 size-3.5 shrink-0" />Order by {fmt(r.cutoff_at)}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}