import type { BatchId } from '../data'

export type Stage = 'new' | 'awaiting' | 'paid' | 'preparing' | 'out' | 'completed'
export type AOrder = {
  no: string; name: string; phone: string; email: string
  pepper: number; plain: number; zobo: number
  mode: 'pickup' | 'delivery'; zone: 'on' | 'off'; address: string; slot: string
  fee: number; feeFinal: boolean; linkSent: boolean; paid: boolean; stage: Stage
  batch: BatchId; placed: string; notes: string
}
export type Settings = {
  open: Record<BatchId, boolean>; cutoff: Record<BatchId, string>
  zobo: boolean; zoboPrice: number; maxOn: boolean; max: number
  feeOn: number; feeOff: number; slots: string[]
}

export const STAGES: { id: Stage | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'new', label: 'New' }, { id: 'awaiting', label: 'Awaiting fee confirmation' },
  { id: 'paid', label: 'Paid' }, { id: 'preparing', label: 'Preparing' }, { id: 'out', label: 'Out for delivery' }, { id: 'completed', label: 'Completed' },
]

const o = (no: string, name: string, phone: string, pepper: number, plain: number, zobo: number, mode: AOrder['mode'], zone: AOrder['zone'], address: string, slot: string, stage: Stage, placed: string, batch: BatchId = 'fri', extra: Partial<AOrder> = {}): AOrder => ({
  no, name, phone, email: name.split(' ')[0].toLowerCase() + '@mail.com', pepper, plain, zobo, mode, zone, address, slot,
  fee: mode === 'pickup' ? 0 : zone === 'on' ? 100 : 200, feeFinal: mode === 'pickup' || stage !== 'awaiting', linkSent: false,
  paid: ['paid', 'preparing', 'out', 'completed'].includes(stage), stage, batch, placed, notes: '', ...extra,
})

export const SEED: AOrder[] = [
  o('TRB-1051', 'Aisha Bello', '0803 412 8890', 10, 5, 0, 'delivery', 'off', 'Tanke Oke-Odo, near Total filling station', '3:15pm', 'awaiting', 'Today, 8:42am', 'fri', { notes: 'Extra pepper please' }),
  o('TRB-1050', 'Tunde Ogunleye', '0816 220 4417', 20, 0, 2, 'delivery', 'on', 'Faculty of Engineering, Block C', '2:45pm', 'new', 'Today, 8:15am'),
  o('TRB-1049', 'Maryam Salami', '0907 118 3320', 0, 10, 0, 'pickup', 'on', 'Central Mosque, Unilorin', 'After Jumah', 'new', 'Today, 7:58am'),
  o('TRB-1048', 'Ibrahim Kareem', '0701 553 9021', 15, 5, 0, 'delivery', 'on', 'Hall 3, Room 214', '3:45pm', 'paid', 'Yesterday, 9:30pm'),
  o('TRB-1047', 'Hauwa Bakare', '0812 667 2045', 5, 5, 1, 'pickup', 'on', 'Central Mosque, Unilorin', 'After Jumah', 'preparing', 'Yesterday, 8:02pm'),
  o('TRB-1046', 'Segun Adeyemi', '0805 911 3376', 10, 10, 0, 'delivery', 'off', 'Sango, behind GTBank', '4:15pm', 'out', 'Yesterday, 6:44pm'),
  o('TRB-1045', 'Zainab Oladipo', '0902 330 1184', 20, 10, 0, 'pickup', 'on', 'Central Mosque, Unilorin', 'After Jumah', 'completed', 'Yesterday, 4:10pm'),
  o('TRB-1044', 'Khadijat Yusuf', '0810 774 5509', 5, 0, 0, 'delivery', 'on', 'Female Hostel B', '4:45pm', 'paid', 'Yesterday, 2:21pm'),
  o('TRB-1043', 'Abdulrahman Lawal', '0706 428 9913', 0, 20, 2, 'pickup', 'on', 'Central Mosque, Unilorin', 'After Jumah', 'completed', 'Yesterday, 11:05am'),
  o('TRB-1042', 'Fatima Abdullahi', '0813 556 7720', 10, 0, 0, 'delivery', 'off', 'GRA, Ilorin', '3:15pm', 'awaiting', 'Yesterday, 10:48am', 'fri'),
  o('TRB-1041', 'Yusuf Olatunji', '0909 221 6638', 10, 10, 0, 'pickup', 'on', 'Central Mosque, Unilorin', 'Morning', 'paid', 'Fri, 9:12pm', 'sat'),
  o('TRB-1040', 'Rukayat Ibrahim', '0803 117 5524', 5, 15, 1, 'delivery', 'on', 'Staff Quarters, Phase 2', 'Morning', 'new', 'Fri, 8:50pm', 'sat'),
  o('TRB-1039', 'Daud Musa', '0817 340 8812', 20, 0, 0, 'pickup', 'on', 'Central Mosque, Unilorin', 'Morning', 'paid', 'Sat, 8:10pm', 'sun'),
]

export const DEFAULTS: Settings = {
  open: { fri: true, sat: true, sun: true }, cutoff: { fri: '07:00', sat: '07:00', sun: '07:00' },
  zobo: true, zoboPrice: 500, maxOn: true, max: 150, feeOn: 100, feeOff: 200,
  slots: ['2:45pm', '3:15pm', '3:45pm', '4:15pm', '4:45pm'],
}

export const items = (x: AOrder) => x.pepper + x.plain + x.zobo
export const sub = (x: AOrder, zoboPrice: number) => (x.pepper + x.plain) * 100 + x.zobo * zoboPrice
export const total = (x: AOrder, zoboPrice: number) => sub(x, zoboPrice) + x.fee
