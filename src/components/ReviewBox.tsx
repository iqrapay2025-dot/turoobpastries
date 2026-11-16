import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Button, Notice, cx } from './ui'
import { getOrderReview, submitReview, type OrderReview, type ReviewError } from '../lib/supabase'
import { messageOf } from '../lib/orderView'

const ERRORS: Record<ReviewError, string> = {
  invalid_rating: 'Please pick a star rating.',
  invalid_comment: 'Please write between 5 and 600 characters.',
  not_found: 'We could not match this order. Check your tracking code and phone number.',
  not_paid: 'Only paid orders can be reviewed.',
  not_allowed: 'This order cannot leave a review.',
  already_reviewed: 'You have already reviewed this order. Thank you!',
}

// Shown on the Track page for paid orders. code/phone are the ones the customer just used to look the order up.
export default function ReviewBox({ code, phone }: { code: string; phone: string }) {
  const [existing, setExisting] = useState<OrderReview | undefined>(undefined) // undefined = still loading
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let alive = true
    getOrderReview(code, phone).then((r) => alive && setExisting(r)).catch(() => alive && setExisting(null))
    return () => { alive = false }
  }, [code, phone])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (rating < 1) { setError(ERRORS.invalid_rating); return }
    if (text.trim().length < 5) { setError(ERRORS.invalid_comment); return }
    setBusy(true)
    try {
      const res = await submitReview(code, phone, rating, text.trim())
      if (res.ok) setSent(true)
      else if (res.error === 'already_reviewed') setExisting({ rating, comment: text.trim(), is_published: false })
      else setError(ERRORS[res.error] ?? 'Could not send your review.')
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  if (existing === undefined) return null

  if (sent || existing) {
    const r = existing
    return (
      <div className="mt-5 rounded-2xl bg-cream p-5">
        <p className="text-sm font-bold">{r?.is_published ? 'Your review is live. Thank you!' : 'Thank you for your review!'}</p>
        {!r?.is_published && <p className="mt-1 text-sm text-ink-soft">We check every review before it appears on the website.</p>}
        {r && <p className="mt-3 text-sm text-ink-soft">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.comment}</p>}
      </div>
    )
  }

  const shown = hover || rating
  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-2xl bg-cream p-5">
      <div>
        <p className="font-semibold">How was your order?</p>
        <p className="text-sm text-ink-soft">Leave a review. It shows as a verified order after we approve it.</p>
      </div>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} aria-pressed={rating === n}
            onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
            className="grid size-11 place-items-center rounded-full transition hover:bg-yellow-light">
            <Star className={cx('size-7', n <= shown ? 'fill-yellow text-yellow' : 'text-ink/30')} />
          </button>
        ))}
      </div>
      <label className="block">
        <span className="sr-only">Your review</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={4} placeholder="Tell us what you thought of the puff-puff..."
          className="w-full rounded-2xl border-2 border-yellow-light bg-white p-4 text-base outline-none transition placeholder:text-ink/60 focus:border-yellow-dark focus:ring-4 focus:ring-yellow/30" />
        <span className="mt-1 block text-right text-xs text-ink/70">{text.length}/600</span>
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <Button full type="submit" loading={busy}>Send review</Button>
    </form>
  )
}