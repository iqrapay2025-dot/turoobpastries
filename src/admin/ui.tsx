import type { ReactNode } from 'react'
import { cx } from '../components/ui'
import type { Stage, AOrder } from './data'

const TONE: Record<Stage, string> = {
  new: 'bg-red text-white', awaiting: 'bg-yellow-light text-red-dark', paid: 'bg-ink text-yellow',
  preparing: 'bg-red-tint text-red-dark', out: 'bg-yellow text-ink', completed: 'bg-ink/8 text-ink/70',
}
export const stageLabel = (s: Stage, mode: AOrder['mode']) =>
  ({ new: 'New', awaiting: 'Awaiting fee', paid: 'Paid', preparing: 'Preparing', out: mode === 'delivery' ? 'Out for delivery' : 'Ready for pickup', completed: 'Completed' })[s]

export function StagePill({ o }: { o: AOrder }) {
  return <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold', TONE[o.stage])}>{o.stage === 'new' && <span className="size-1.5 animate-pulse rounded-full bg-white" />}{stageLabel(o.stage, o.mode)}</span>
}
export function PayPill({ o }: { o: AOrder }) {
  return o.paid
    ? <span className="inline-flex rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-yellow">Paid</span>
    : <span className={cx('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', o.linkSent ? 'bg-yellow-light text-red-dark' : 'bg-ink/8 text-ink/70')}>{o.linkSent ? 'Link sent' : 'Unpaid'}</span>
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl border border-ink/10 bg-white shadow-[0_2px_12px_-4px_rgba(17,17,17,.08)]', className)}>{children}</div>
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="grid h-11 min-w-12 shrink-0 place-items-center rounded-full">
      <span className={cx('relative block h-7 w-12 rounded-full transition-colors', on ? 'bg-red' : 'bg-ink/30')}>
        <span className={cx('absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
      </span>
    </button>
  )
}
