import { IMG } from '../data'

// Maps a Supabase product row to the shape the UI components expect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toProduct = (p: any) => {
  const lower = String(p.name ?? '').toLowerCase()
  const isZobo = lower.includes('zobo')
  return {
    ...p,
    desc: p.desc ?? p.description ?? '',
    img: p.img ?? p.image_url ?? (isZobo ? IMG.zobo : lower.includes('without') ? IMG.plain : IMG.pepper),
    unit: p.unit ?? (isZobo ? 'bottle' : 'piece'),
    partner: p.partner ?? p.partner_name ?? undefined,
    available: p.is_available !== false,
  }
}