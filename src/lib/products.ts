import { IMG } from '../data'

// Maps a Supabase product row to the shape the UI components expect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toProduct = (p: any) => {
  const lower = String(p.name ?? '').toLowerCase()
  const isTigernut = lower.includes('tigernut')
  const isDrink = lower.includes('zobo') || isTigernut
  return {
    ...p,
    desc: p.desc ?? p.description ?? '',
    img: p.img ?? p.image_url ?? (isTigernut ? IMG.tigernut : isDrink ? IMG.zobo : lower.includes('without') ? IMG.plain : IMG.pepper),
    unit: p.unit ?? (isDrink ? 'bottle' : 'piece'),
    partner: p.partner ?? p.partner_name ?? undefined,
    available: p.is_available !== false,
  }
}