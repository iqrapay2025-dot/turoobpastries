import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, EyeOff, Trash2, ShieldCheck } from 'lucide-react'
import { Card } from './ui'
import { Button, Stars, cx } from '../components/ui'
import { useApp } from '../store'
import { fetchAllReviews, setReviewPublished, deleteReview, type AdminReview } from '../lib/supabase'

type Tab = 'pending' | 'published'

export default function Reviews({ onChanged }: { onChanged?: () => void }) {
  const { toast } = useApp()
  const [rows, setRows] = useState<AdminReview[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setRows(await fetchAllReviews()) } catch (e) { console.error(e); toast('error', 'Could not load reviews.') } finally { setLoaded(true) }
  }, [toast])
  useEffect(() => { void load() }, [load])

  const pending = useMemo(() => rows.filter((r) => !r.is_published), [rows])
  const published = useMemo(() => rows.filter((r) => r.is_published), [rows])
  const list = tab === 'pending' ? pending : published

  const act = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id)
    try { await fn(); toast('success', ok); await load(); onChanged?.() } catch (e) { console.error(e); toast('error', 'Something went wrong. Try again.') } finally { setBusy(null) }
  }

  const remove = (r: AdminReview) => {
    if (!window.confirm(`Delete this review from ${r.author_name}? This cannot be undone.`)) return
    void act(r.id, () => deleteReview(r.id), 'Review deleted.')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Reviews</h1>
        <p className="text-ink/70">Customers with a paid order can leave a review. Approve it to show it on the website.</p>
      </div>
      <div className="flex gap-2">
        {([['pending', `Waiting (${pending.length})`], ['published', `Live (${published.length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('min-h-11 rounded-full px-5 text-sm font-semibold', tab === k ? 'bg-red text-white' : 'bg-cream text-ink-soft hover:bg-yellow-light')}>{label}</button>
        ))}
      </div>
      <Card className="divide-y divide-ink/10 overflow-hidden">
        {!loaded && <p className="p-6 text-center text-sm text-ink/70">Loading reviews…</p>}
        {loaded && list.length === 0 && <p className="p-6 text-center text-sm text-ink/70">{tab === 'pending' ? 'No reviews waiting for approval.' : 'No reviews are live yet.'}</p>}
        {list.map((r) => (
          <article key={r.id} className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {r.author_name}
                  {r.is_verified && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-light px-2 py-0.5 text-xs font-bold text-red-dark"><ShieldCheck className="size-3.5" />Verified order{r.orders?.order_number ? ` ${r.orders.order_number}` : ''}</span>}
                </p>
                <p className="text-xs text-ink/70">{new Date(r.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <Stars n={r.rating} />
            </div>
            <p className="whitespace-pre-wrap wrap-break-word text-sm text-ink-soft">{r.comment}</p>
            <div className="flex flex-wrap gap-2">
              {r.is_published
                ? <Button variant="secondary" size="sm" loading={busy === r.id} onClick={() => act(r.id, () => setReviewPublished(r.id, false), 'Review hidden from the website.')}><EyeOff className="size-4" />Hide</Button>
                : <Button size="sm" loading={busy === r.id} onClick={() => act(r.id, () => setReviewPublished(r.id, true), 'Review is now live.')}><Check className="size-4" />Approve</Button>}
              <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => remove(r)}><Trash2 className="size-4" />Delete</Button>
            </div>
          </article>
        ))}
      </Card>
    </div>
  )
}