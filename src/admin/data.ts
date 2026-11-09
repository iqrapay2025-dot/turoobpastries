import type { BatchId } from '../data'

export type Stage = 'new' | 'awaiting' | 'paid' | 'preparing' | 'out' | 'completed' | 'cancelled'

export type AOrder = {
  id?: string // database id, set by AdminApp when loading orders
  no: string; name: string; phone: string; email: string
  pepper: number; plain: number; zobo: number
  mode: 'pickup' | 'delivery'; zone: 'on' | 'off'; address: string; slot: string
  fee: number; feeFinal: boolean; linkSent: boolean; paid: boolean; stage: Stage
  batch: BatchId; placed: string; notes: string
  paymentStatus?: string // raw payment_status: unpaid | paid | failed | refunded
  feeStatus?: string // optional: raw fee_status from the database, if AdminApp passes it
    dbTotal?: number // the total stored in the database (what was actually charged)
      batchDate?: string // the date of the batch, "YYYY-MM-DD"
}

export type Settings = {
  open: Record<BatchId, boolean>; cutoff: Record<BatchId, string>
  opens?: Record<BatchId, string> // evening-before opening time, "HH:MM"
  zobo: boolean; zoboPrice: number; maxOn: boolean; max: number
  feeOn: number; feeOff: number; slots: string[]
  puffPrice?: number // optional: defaults to PUFF_PRICE when not provided
}

/** Fallback price per puff-puff piece (₦). Used when settings.puffPrice isn't set. */
export const PUFF_PRICE = 100

/** Tabs shown on the Orders page. 'out' is "out for delivery" or "ready for pickup", depending on the order's mode. */
export const STAGES: { id: Stage | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'awaiting', label: 'Awaiting fee confirmation' },
  { id: 'paid', label: 'Paid' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'out', label: 'Out / ready' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

/** Label for each individual stage, for pills and badges. Covers every Stage. */
export const STAGE_LABEL: Record<Stage, string> = {
  new: 'New',
  awaiting: 'Awaiting fee',
  paid: 'Paid',
  preparing: 'Preparing',
  out: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** The 'out' stage reads differently for pickup orders. */
export const READY_LABEL = 'Ready for pickup'

/** Starting values only. AdminApp loads the real settings from the database. */
export const DEFAULTS: Settings = {
  open: { fri: true, sat: true, sun: true },
  cutoff: { fri: '07:00', sat: '07:00', sun: '07:00' },
  opens: { fri: '18:00', sat: '18:00', sun: '18:00' },
  zobo: true, zoboPrice: 500, maxOn: true, max: 150, feeOn: 100, feeOff: 200,
  slots: ['2:45pm', '3:15pm', '3:45pm', '4:15pm', '4:45pm'],
  puffPrice: PUFF_PRICE,
}

export const items = (x: AOrder) => x.pepper + x.plain + x.zobo

export const sub = (x: AOrder, zoboPrice: number, puffPrice: number = PUFF_PRICE) =>
  x.dbTotal !== undefined
    ? x.dbTotal - (x.mode === 'pickup' ? 0 : x.fee)
    : (x.pepper + x.plain) * puffPrice + x.zobo * zoboPrice

/** Pickup orders never carry a delivery fee. */
export const total = (x: AOrder, zoboPrice: number, puffPrice: number = PUFF_PRICE) =>
  x.dbTotal ?? sub(x, zoboPrice, puffPrice) + (x.mode === 'pickup' ? 0 : x.fee)