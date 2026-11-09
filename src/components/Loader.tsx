import LottieAnimation from './LottieAnimation'
import { cx } from './ui'

export default function Loader({ label, page }: { label?: string; page?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={cx('grid place-items-center text-center text-ink-soft', page ? 'min-h-[60vh]' : 'py-10')}>
      <div>
        <LottieAnimation className="mx-auto size-28" />
        {label && <p className="mt-2 text-sm font-medium">{label}</p>}
      </div>
    </div>
  )
}