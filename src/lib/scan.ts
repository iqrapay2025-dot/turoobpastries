// What goes inside an order's QR code, and how the staff Scan page reads it back.
//
// The code holds a link to the staff scan page with the order number in it:
//   https://your-site/admin/scan?o=TRB-1042
// So a phone camera app opens the scan page straight away (staff must be signed in),
// and the in-app scanner only needs the order number out of it.

export const scanUrl = (orderNumber: string): string =>
  `${window.location.origin}/admin/scan?o=${encodeURIComponent(orderNumber)}`

// Accepts a scanned link, a typed order number, or a number with spaces/lowercase.
export function orderNumberFromScan(text: string): string | null {
  const raw = text.trim()
  if (!raw) return null
  let candidate = raw
  try {
    const fromUrl = new URL(raw).searchParams.get('o')
    if (fromUrl) candidate = fromUrl
  } catch {
    /* not a link, treat it as a typed number */
  }
  const m = candidate.toUpperCase().match(/[A-Z]{2,5}-\d{1,10}/)
  return m ? m[0] : null
}