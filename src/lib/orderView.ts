// Shared helpers for the pages that open an order from its secret link.

export type OrderView = {
  order_number: string
  track_code: string
  customer_name: string
  customer_email: string
  fulfilment: 'pickup' | 'delivery'
  zone: 'on_campus' | 'off_campus' | null
  delivery_address: string | null
  landmark: string | null
  delivery_slot: string | null
  batch_date: string
  batch_label: string | null
  serving_time_label: string | null
  subtotal: number
  delivery_fee: number
  total: number
  fee_status: 'not_applicable' | 'pending_review' | 'confirmed' | 'accepted' | 'declined'
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded'
  order_status: 'received' | 'preparing' | 'out_for_delivery' | 'ready_for_pickup' | 'completed' | 'cancelled'
  items: Array<{ id: string; name: string; qty: number; price: number }>
}

// "#/fee?token=abc" -> "abc"
export const tokenFromRoute = (route: string): string | null =>
  new URLSearchParams(route.split('?')[1] ?? '').get('token')

// order_status -> position in the 4-step tracker
export const stageIndex = (s: OrderView['order_status']): number =>
  s === 'preparing' ? 1 : s === 'out_for_delivery' || s === 'ready_for_pickup' ? 2 : s === 'completed' ? 3 : 0

export const messageOf = (e: unknown): string =>
  e instanceof Error
    ? e.message
    : typeof e === 'object' && e && 'message' in e
      ? String((e as { message: unknown }).message)
      : 'Something went wrong. Please try again.'

export const prettyDate = (isoDate: string): string =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })