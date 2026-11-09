type Listener = (no: string) => void

let pending: string | null = null
const listeners = new Set<Listener>()

// Called by the notifications panel.
export function requestOpenOrder(no: string) {
  pending = no
  listeners.forEach((l) => l(no))
}

// Called by Orders when it mounts (covers the case where it wasn't on screen yet).
export function takePendingOrder() {
  const p = pending
  pending = null
  return p
}

// Called by Orders to hear about requests while it's already on screen.
export function subscribeOpenOrder(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}