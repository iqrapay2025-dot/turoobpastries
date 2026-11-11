// Remembers the buyer's name, phone and email on this device only, so checkout is pre-filled.
export type SavedCustomer = { name: string; phone: string; email: string }
const KEY = 'turoob_saved_customer'
const empty: SavedCustomer = { name: '', phone: '', email: '' }

export function loadSavedCustomer(): SavedCustomer {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const v = JSON.parse(raw) as Partial<SavedCustomer>
    return { name: v.name ?? '', phone: v.phone ?? '', email: v.email ?? '' }
  } catch { return empty }
}
export function saveCustomer(c: SavedCustomer) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
}
export function forgetCustomer() {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}