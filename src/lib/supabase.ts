import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// --- Products (all of them, so unavailable ones can show "Not available this week") ---
export async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

// --- App settings (single row) ---
export async function fetchAppSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

// --- Delivery slots (active only; optionally for one batch day) ---
export async function fetchDeliverySlots(batchDayId?: number) {
  let query = supabase
    .from('delivery_slots')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (batchDayId !== undefined) query = query.eq('batch_day_id', batchDayId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// --- Batch status (no arguments; returns one row per batch day) ---
export async function getBatchStatus() {
  const { data, error } = await supabase.rpc('get_batch_status')
  if (error) throw error
  return data || []
}

// --- Place order ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function placeOrder(order: any) {
  const { data, error } = await supabase.rpc('place_order', { p_order: order })
  if (error) throw error
  return data
}

// --- Edge Function: notify (emails) ---
export async function notify(params: { type: 'order_received' | 'fee_confirm' | 'order_ready'; public_token?: string; order_id?: string }) {
  const { data, error } = await supabase.functions.invoke('notify', { body: params })
  if (error) throw error
  return data
}

// --- Edge Function: paystack-init ---
export async function paystackInit(params: { public_token: string }) {
  const { data, error } = await supabase.functions.invoke('paystack-init', {
    body: { public_token: params.public_token },
  })
  if (error) throw error
  return data as { authorization_url: string; reference: string }
}

// --- Gift orders: attach the recipient to an order just placed (needs turoob-gifts.sql) ---
export async function setGiftDetails(token: string, details: { recipient_name: string; recipient_phone: string; gift_message?: string }) {
  const { error } = await supabase.rpc('set_gift_details', { p_token: token, p_details: details })
  if (error) throw error
}

// --- Pickup orders: record the chosen pickup window (needs turoob-pickup.sql) ---
export async function setPickupSlot(token: string, slot: string) {
  const { error } = await supabase.rpc('set_pickup_slot', { p_token: token, p_slot: slot })
  if (error) throw error
}

// --- Waiting-time games (turoob-games.sql). All answers are checked in the database. ---
export type GameKind = 'riddle' | 'puzzle' | 'math' | 'memory'
export type GameStatus = { enabled: boolean; eligible?: boolean; prizes_left?: boolean; status?: 'none' | 'playing' | 'won' | 'lost'; kind?: GameKind | null; bonus_puffs?: number }
export type GamePayload =
  | { kind: 'riddle' | 'puzzle' | 'math'; questions: Array<{ question: string; options: string[] }> }
  | { kind: 'memory'; size: number; max_moves: number; moves: number; matched: Array<{ idx: number; symbol: string }> }
export type FlipResult = { symbol: string; phase: 'first' | 'second'; first?: number; match?: boolean; moves?: number; done?: boolean; won?: boolean; awarded?: boolean }
export type SubmitResult = { won: boolean; correct: number; total: number; answers: string[]; awarded: boolean }

export async function gameStatus(token: string) {
  const { data, error } = await supabase.rpc('game_status', { p_token: token })
  if (error) throw error
  return data as GameStatus
}
export async function gameStart(token: string, kind: GameKind) {
  const { data, error } = await supabase.rpc('game_start', { p_token: token, p_kind: kind })
  if (error) throw error
  return data as GamePayload
}
export async function gameSubmit(token: string, answers: string[]) {
  const { data, error } = await supabase.rpc('game_submit', { p_token: token, p_answers: answers })
  if (error) throw error
  return data as SubmitResult
}
export async function gameFlip(token: string, idx: number) {
  const { data, error } = await supabase.rpc('game_flip', { p_token: token, p_idx: idx })
  if (error) throw error
  return data as FlipResult
}
// --- Get order by token ---
export async function getOrderByToken(token: string) {
  const { data, error } = await supabase.rpc('get_order_by_token', { p_token: token })
  if (error) throw error
  return data
}

// --- Track order ---
export async function trackOrder(trackCode: string, phone: string) {
  const { data, error } = await supabase.rpc('track_order', { p_code: trackCode, p_phone: phone })
  if (error) throw error
  return data
}

// --- Respond to delivery fee ---
export async function respondToDeliveryFee(token: string, accept: boolean) {
  const { data, error } = await supabase.rpc('respond_to_delivery_fee', { p_token: token, p_accept: accept })
  if (error) throw error
  return data
}

// --- Admin: is the logged-in user an admin? (no arguments) ---
export async function isAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) throw error
  return data as boolean
}

// --- Admin: set delivery fee ---
export async function adminSetDeliveryFee(orderId: string, fee: number) {
  const { data, error } = await supabase.rpc('admin_set_delivery_fee', { p_order_id: orderId, p_fee: fee })
  if (error) throw error
  return data
}

// --- Admin: batch summary ---
export async function adminBatchSummary(batchDate: string) {
  const { data, error } = await supabase.rpc('admin_batch_summary', { p_batch_date: batchDate })
  if (error) throw error
  return data
}

// --- Admin: fetch orders ---
export async function fetchOrders(filters?: { status?: string; search?: string }) {
  let query = supabase
    .from('orders')
        .select('*, order_items (*), customers (customer_code, is_blocked)')
    .order('created_at', { ascending: false })
  if (filters?.status) query = query.eq('order_status', filters.status)
  if (filters?.search) {
    // Strip characters that would break the PostgREST filter string.
    const s = filters.search.replace(/[,()%*]/g, ' ').trim()
    if (s) {
      query = query.or(
        `customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,order_number.ilike.%${s}%`
      )
    }
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// --- Admin: customers (admin read) and blocking ---
export async function fetchCustomers() {
  const { data, error } = await supabase.from('customers').select('id, customer_code, email, full_name, phone, is_blocked, blocked_reason').order('customer_code')
  if (error) throw error
  return data || []
}
export async function setCustomerBlocked(id: string, blocked: boolean, reason?: string) {
  const { error } = await supabase.from('customers').update({ is_blocked: blocked, blocked_reason: blocked ? (reason || null) : null }).eq('id', id)
  if (error) throw error
}
// --- Admin: live orders ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function subscribeToOrders(callback: (payload: any) => void) {
  const channel = supabase
    .channel('orders_changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, callback)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, callback)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// --- Reviews (published only) ---
export async function fetchReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// --- Team members (active only) ---
export async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}