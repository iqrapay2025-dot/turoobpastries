// "Order this again": turn a past order's lines into a cart, matching products by name.
export type ReorderLine = { name: string; qty?: number; quantity?: number }

export function cartFromLines(lines: ReorderLine[], products: Array<{ id: string; name: string; is_available?: boolean }>) {
  const cart: Record<string, number> = {}
  let skipped = 0
  for (const l of lines) {
    const p = products.find((x) => x.name === l.name)
    const q = l.quantity ?? l.qty ?? 0
    if (!p || p.is_available === false || q <= 0) { skipped += 1; continue }
    cart[p.id] = (cart[p.id] ?? 0) + q
  }
  return { cart, skipped }
}