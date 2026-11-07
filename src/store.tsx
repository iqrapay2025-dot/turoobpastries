import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchProducts, fetchAppSettings, fetchDeliverySlots, getBatchStatus } from './lib/supabase'



// Routes keep the same "#/path?query" shape the rest of the app uses,
// but now come from the real URL path (/order, /admin ...).
const currentRoute = () => '#' + (window.location.pathname || '/') + window.location.search

// Old links like /#/confirmation?token=... are converted to clean paths on load.
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1))
}
/* ------------------------------------------------------------------ types */
type Toast = { id: string; kind: 'success' | 'error' | 'info'; text: string }

export type Fulfilment = 'pickup' | 'delivery'
export type BatchId = 'fri' | 'sat' | 'sun'

export type Order = {
  number: string
  name: string
  phone: string
  email: string
  items: Array<{ id: string; name: string; qty: number; price: number }>
  mode: Fulfilment
  zone: 'on' | 'off'
  address: string
  landmark: string
  slot: string
  notes: string
  subtotal: number
  fee: number
  total: number
  status: number
  feeConfirmed: boolean
  batch: BatchId
  public_token?: string
}

// One row of get_batch_status() (after migration 001)
export type BatchRow = {
  batch_day_id: number
  label: string
  day_of_week: number
  serving_time_label: string | null
  batch_date: string
  opens_at: string
  cutoff_at: string
  is_enabled: boolean
  is_open: boolean
  is_sold_out: boolean
  max_portions: number | null
  portions_left: number | null
  note: string | null
}

type AppState = {
  // existing fields (kept so current components keep working)
  closed: boolean
  anyOpen: boolean
  batch: BatchId
  setBatch: (b: BatchId) => void
  count: number
  subtotal: number
  cart: Record<string, number>
  setCart: (c: Record<string, number>) => void
  go: (href: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOrder: (order: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any | null
  setQty: (id: string, qty: number) => void
  preview: Record<string, boolean> // demo-only, remove the preview panel later
  setPreview: (p: Record<string, boolean>) => void
  toast: (kind: 'success' | 'error' | 'info', text: string) => void
  toasts: Toast[]
  route: string
  target: Date | null
  now: Date
  batchOpen: (id: string) => boolean
  clear: () => void
  // new: real data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[]
  productsError: boolean
  productsLoading: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slots: any[]
  batchRows: BatchRow[]
  batchError: boolean
  currentBatch: BatchRow | null
  refresh: () => void
}

/* --------------------------------------------------- batch id <-> weekday */
const DOW: Record<BatchId, number> = { fri: 5, sat: 6, sun: 0 }

// Module-level copy of the latest batch rows so plain helpers (batchInfo) can read it.
let BATCH_CACHE: Record<number, BatchRow> = {}

/* ---------------------------------------------------------------- context */
const StoreContext = createContext<AppState | null>(null)

export const useApp = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useApp must be used within a StoreProvider')
  return ctx
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/* --------------------------------------------------------------- provider */
export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [batch, setBatch] = useState<BatchId>(() => {
    const saved = readJson<string>('turoob_batch', 'fri')
    return saved === 'sat' || saved === 'sun' ? saved : 'fri'
  })
  const [cart, setCart] = useState<Record<string, number>>(() => readJson('turoob_cart', {}))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrderState] = useState<any>(() => readJson('turoob_last_order', null))
  const [preview, setPreview] = useState<Record<string, boolean>>({ closed: false, soldOut: false, zobo: false, payFail: false })
  const [toasts, setToasts] = useState<Toast[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([])
  const [productsError, setProductsError] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [slots, setSlots] = useState<any[]>([])
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [batchError, setBatchError] = useState(false)

    const [route, setRoute] = useState(currentRoute)
  const [now, setNow] = useState(() => new Date())

  /* ---- clock (drives countdowns and open/closed checks) ---- */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

    /* ---- route (clean paths) ---- */
  useEffect(() => {
    const sync = () => setRoute(currentRoute())
    const onHash = () => {
      if (window.location.hash.startsWith('#/')) {
        window.history.replaceState(null, '', window.location.hash.slice(1))
        sync()
      }
    }
    // Links written as href="#/order" are turned into real page changes.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a')
      const href = a?.getAttribute('href')
      if (!a || !href || !href.startsWith('#/') || (a.target && a.target !== '_self')) return
      e.preventDefault()
      window.history.pushState(null, '', href.slice(1))
      sync()
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onClick)
    }
  }, [])

  /* ---- cart persistence ---- */
   /* ---- cart persistence ---- */
  useEffect(() => {
    try {
      localStorage.setItem('turoob_cart', JSON.stringify(cart))
    } catch { /* storage unavailable */ }
  }, [cart])

  /* ---- load data ---- */
  const loadBatch = useCallback(async () => {
    try {
      const rows = (await getBatchStatus()) as BatchRow[]
      BATCH_CACHE = Object.fromEntries(rows.map((r) => [r.day_of_week, r]))
      setBatchRows(rows)
      setBatchError(false)
    } catch (e) {
      console.error('Batch status error:', e)
      setBatchError(true) // treated as closed, never as open
    }
  }, [])

  const loadCatalog = useCallback(async () => {
    setProductsLoading(true)
    const [p, s, d] = await Promise.allSettled([fetchProducts(), fetchAppSettings(), fetchDeliverySlots()])
    if (p.status === 'fulfilled') {
      setProducts(p.value)
      setProductsError(false)
    } else {
      console.error('Products error:', p.reason)
      setProductsError(true)
    }
    if (s.status === 'fulfilled') setSettings(s.value)
    else console.error('Settings error:', s.reason)
    if (d.status === 'fulfilled') setSlots(d.value)
    else console.error('Slots error:', d.reason)
    setProductsLoading(false)
  }, [])

  useEffect(() => {
    loadCatalog()
    loadBatch()
    const t = setInterval(loadBatch, 60_000) // keep open/closed and portions fresh
    return () => clearInterval(t)
  }, [loadCatalog, loadBatch])

  const refresh = useCallback(() => {
    loadCatalog()
    loadBatch()
  }, [loadCatalog, loadBatch])

  /* ---- once products are known, drop cart lines that no longer exist ---- */
  useEffect(() => {
    if (products.length === 0) return
    const ids = new Set(products.map((p) => p.id))
    setCart((c) => {
      const kept = Object.fromEntries(Object.entries(c).filter(([id]) => ids.has(id)))
      return Object.keys(kept).length === Object.keys(c).length ? c : kept
    })
  }, [products])

  /* ---- derived values ---- */
  const count = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart])

  const subtotal = useMemo(() => {
    const price = new Map(products.map((p) => [p.id, Number(p.price)]))
    return Object.entries(cart).reduce((s, [id, q]) => s + (price.get(id) ?? 0) * q, 0)
  }, [cart, products])

  const rowFor = useCallback((id: string) => BATCH_CACHE[DOW[id as BatchId]] ?? batchRows.find((r) => r.day_of_week === DOW[id as BatchId]), [batchRows])

  // A batch is open when the server said it is enabled and the clock is inside its window.
  const batchOpen = useCallback((id: string) => {
    if (batchError) return false
    const r = rowFor(id)
    if (!r || !r.is_enabled || r.is_sold_out) return false
    return now >= new Date(r.opens_at) && now < new Date(r.cutoff_at)
  }, [batchError, rowFor, now])

  const currentBatch = useMemo(() => batchRows.find((r) => r.day_of_week === DOW[batch]) ?? null, [batchRows, batch])
  const anyOpen = (['fri', 'sat', 'sun'] as BatchId[]).some((b) => batchOpen(b))
  const closed = !batchOpen(batch)
  const target = currentBatch ? new Date(currentBatch.cutoff_at) : new Date(0)

  /* ---- actions ---- */
  const setQty = useCallback((id: string, qty: number) => {
    setCart((c) => {
      if (qty <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = c
        return rest
      }
      return { ...c, [id]: qty }
    })
  }, [])

    const go = useCallback((href: string) => {
    const path = href.startsWith('#') ? href.slice(1) : href
    window.history.pushState(null, '', path || '/')
    setRoute(currentRoute())
    window.scrollTo({ top: 0 })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setOrder = useCallback((form: any) => {
    setOrderState(form)
    try {
      localStorage.setItem('turoob_last_order', JSON.stringify(form))
    } catch { /* storage unavailable */ }
  }, [])

  const toast = useCallback((kind: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, kind, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  const clear = useCallback(() => {
    setCart({})
  }, [])

  const value: AppState = {
    closed, anyOpen, batch, setBatch, count, subtotal, cart, setCart, go,
    setOrder, order, setQty, preview, setPreview, toast, toasts, route,
    target, now, batchOpen, clear,
    products, productsError, productsLoading, settings, slots,
    batchRows, batchError, currentBatch, refresh,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/* ------------------------------------------------------------- batchInfo */
// Same shape as before, but driven by the database instead of fixed 7am times.
export const batchInfo = (now: Date, batchId: BatchId) => {
  const row = BATCH_CACHE[DOW[batchId]]
  if (!row) {
    const zero = new Date(0)
    return { open: false, cutoff: zero, opensAt: zero, isOpen: false, cutoffPassed: false }
  }
  const cutoff = new Date(row.cutoff_at)
  const opensAt = new Date(row.opens_at)
  const isOpen = row.is_enabled && !row.is_sold_out && now >= opensAt && now < cutoff
  return { open: isOpen, cutoff, opensAt, isOpen, cutoffPassed: now >= cutoff }
}