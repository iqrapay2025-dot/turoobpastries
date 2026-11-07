import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'
import { Minus, Plus, ChevronDown, Check, X, AlertCircle, Info, Star, Loader2 } from 'lucide-react'
import { useApp } from '../store'

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'yellow' | 'dark' | 'ghost'; size?: 'md' | 'lg' | 'sm'; loading?: boolean; full?: boolean }
export function Button({ variant = 'primary', size = 'md', loading, full, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-red text-white shadow-pop hover:-translate-y-0.5 hover:bg-red-dark hover:shadow-[0_18px_34px_-10px_rgba(155,27,27,.5)] active:scale-[.97]',
    secondary: 'border-2 border-red text-red bg-white hover:-translate-y-0.5 hover:bg-red hover:text-white active:scale-[.97]',
    yellow: 'bg-yellow text-ink hover:-translate-y-0.5 hover:bg-yellow-light shadow-soft',
    dark: 'bg-ink text-white hover:-translate-y-0.5 hover:bg-red active:scale-[.97]',
    ghost: 'text-ink hover:bg-yellow-light/60',
  }[variant]
  const s = { sm: 'h-11 px-4 text-sm', md: 'h-11 px-6 text-[15px]', lg: 'h-14 px-8 text-base' }[size]
  return (
    <button
      disabled={disabled || loading}
      className={cx('group/btn inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 [&>svg:last-child:not(.spin)]:transition-transform hover:[&>svg:last-child:not(.spin)]:translate-x-1 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-red',
        s, v, full && 'w-full', (disabled || loading) && 'bg-ink/10! text-ink/40! shadow-none! border-ink/10! hover:bg-ink/10! hover:translate-y-0!', className)}
      {...p}>
      {loading && <Loader2 className="spin size-4" />}
      {children}
    </button>
  )
}

type Tone = 'open' | 'closed' | 'soon' | 'paid' | 'preparing' | 'soldout'
export function Badge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const t = {
    open: 'bg-yellow text-ink',
    closed: 'bg-red-tint text-red-dark',
    soon: 'bg-yellow-light text-red-dark',
    paid: 'bg-ink text-yellow',
    preparing: 'bg-red-light text-red-dark',
    soldout: 'bg-ink text-white',
  }[tone]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide', t, className)}>
      {tone === 'open' && <span className="size-2 animate-pulse rounded-full bg-red" />}
      {children}
    </span>
  )
}

export function Stepper({ value, onChange, disabled, size = 'md' }: { value: number; onChange: (n: number) => void; disabled?: boolean; size?: 'sm' | 'md' }) {
  const b = 'size-11'
  return (
    <div className={cx('inline-flex items-center gap-1 rounded-full bg-yellow-light/70 p-1', disabled && 'opacity-50')}>
      <button aria-label="Decrease" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} className={cx(b, 'grid place-items-center rounded-full bg-white text-red shadow-sm transition hover:bg-red hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-red')}><Minus className="size-4" /></button>
      <span className="min-w-10 text-center font-display text-lg font-semibold tabular-nums">{value}</span>
      <button aria-label="Increase" disabled={disabled} onClick={() => onChange(value + 1)} className={cx(b, 'grid place-items-center rounded-full bg-red text-white shadow-sm transition hover:bg-red-dark disabled:opacity-40')}><Plus className="size-4" /></button>
    </div>
  )
}

export function Field({ label, error, hint, optional, valid, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; optional?: boolean; valid?: boolean }) {
  const ok = valid ?? (!error && !!p.value && p.value !== '')
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">{label}{optional && <span className="text-xs font-normal text-ink/70">Optional</span>}</span>
      <span className="relative block">
        <input {...p} aria-invalid={!!error} className={cx('h-12 w-full rounded-2xl border-2 bg-white px-4 text-base outline-none transition placeholder:text-ink/60 focus:border-yellow-dark focus:ring-4 focus:ring-yellow/30', error ? 'border-red bg-red-tint/40' : 'border-yellow-light', ok && 'pr-11')} />
        {ok && <Check className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-red-dark" />}
      </span>
      {error ? <span className="mt-1.5 flex items-center gap-1 text-sm font-medium text-red"><AlertCircle className="size-4" />{error}</span> : hint && <span className="mt-1.5 block text-xs text-ink/70">{hint}</span>}
    </label>
  )
}

export function Accordion({ items }: { items: string[][] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="space-y-3">
      {items.map(([q, a], i) => (
        <div key={q} className={cx('overflow-hidden rounded-3xl bg-white shadow-soft transition hover:shadow-pop', open === i && 'ring-2 ring-yellow')}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-[17px] font-medium">
            {q}
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-full transition', open === i ? 'rotate-180 bg-red text-white' : 'bg-yellow-light text-red-dark')}><ChevronDown className="size-4" /></span>
          </button>
          <div className={cx('grid transition-all duration-300', open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            <p className="overflow-hidden px-5 text-ink-soft"><span className="block pb-5 leading-relaxed">{a}</span></p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Stars({ n }: { n: number }) {
  return <div className="flex gap-0.5" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cx('size-4', i <= n ? 'fill-yellow text-yellow' : 'text-yellow-light')} />)}</div>
}

export function Tracker({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="space-y-0 sm:flex sm:items-start">
      {steps.map((s, i) => {
        const done = i < current, active = i === current
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-3 sm:pb-0 sm:text-center">
            {i < steps.length - 1 && <span className={cx('absolute left-5 top-10 h-[calc(100%-2.5rem)] w-1 -translate-x-1/2 rounded sm:left-1/2 sm:top-5 sm:h-1 sm:w-full', done ? 'bg-red' : 'bg-yellow-light')} />}
            <span className={cx('relative z-10 grid size-10 shrink-0 place-items-center rounded-full font-display font-semibold', done && 'bg-red text-white', active && 'bg-yellow text-ink ring-4 ring-yellow-light', !done && !active && 'bg-yellow-light text-red-dark')}>
              {done ? <Check className="size-5" /> : i + 1}
            </span>
            <span className={cx('pt-2 text-sm font-semibold sm:pt-0', !done && !active && 'text-ink/70')}>{s}{active && <span className="block text-xs font-medium text-red">Current step</span>}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function Toasts() {
  const { toasts } = useApp()
  const icon = { success: <Check className="size-4" />, error: <AlertCircle className="size-4" />, info: <Info className="size-4" /> }
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-70 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className="pop-in pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-pop">
          <span className={cx('grid size-6 place-items-center rounded-full text-ink', t.kind === 'error' ? 'bg-red-light' : 'bg-yellow')}>{icon[t.kind]}</span>{t.text}
        </div>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-80 grid place-items-end bg-ink/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal className="pop-in w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-pop sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-yellow-light"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Notice({ tone = 'info', children, title }: { tone?: 'info' | 'error' | 'warn'; children: ReactNode; title?: string }) {
  const t = { info: 'bg-yellow-light/60 text-ink', warn: 'bg-yellow-light text-ink', error: 'bg-red-tint text-red-dark' }[tone]
  return (
    <div className={cx('flex gap-3 rounded-2xl p-4 text-sm', t)}>
      {tone === 'error' ? <AlertCircle className="mt-0.5 size-5 shrink-0" /> : <Info className="mt-0.5 size-5 shrink-0 text-red-dark" />}
      <div>{title && <p className="font-bold">{title}</p>}<div className="leading-relaxed">{children}</div></div>
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[28px] border-2 border-dashed border-yellow bg-white/60 p-8 text-center">
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-yellow-light text-red">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const Sparkle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cx('twinkle absolute fill-yellow', className)} aria-hidden><path d="M12 0c.8 6.5 3.5 9.2 12 12-8.5 2.8-11.2 5.5-12 12-.8-6.500-3.500-9.200-12-12 8.500-2.800 11.200-5.500 12-12z" /></svg>
)

export function SectionTitle({ eyebrow, title, sub, center }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={cx('mb-8 max-w-2xl', center && 'mx-auto text-center')}>
      <span className="mb-3 inline-block rounded-full bg-yellow px-3 py-1 text-xs font-bold uppercase tracking-wider">{eyebrow}</span>
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {sub && <p className="mt-3 text-base text-ink-soft sm:text-lg">{sub}</p>}
    </div>
  )
}
