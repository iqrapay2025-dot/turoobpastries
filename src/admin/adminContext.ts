import { createContext, useContext } from 'react'
import type { AOrder, Settings } from './data'

// Delivery time slots for each batch day, e.g. { fri: ['2:45pm', ...], sat: ['7:00am'], sun: [] }
export type SlotsByDay = Record<'fri' | 'sat' | 'sun', string[]>

export type Ctx = {
  orders: AOrder[]
  setOrders: (f: (o: AOrder[]) => AOrder[]) => void
  settings: Settings
  setSettings: (s: Settings) => void
  seen: Set<string>
  markSeen: (no: string) => void
  slotsByDay: SlotsByDay
  // These write to Supabase:
  saveSettings: (s: Settings, slots: SlotsByDay) => Promise<void>
  setStage: (no: string, stage: string) => Promise<void>
  markPaidManually: (no: string) => Promise<void>
  markRefunded: (no: string) => Promise<void>
  confirmFee: (no: string, fee: number) => Promise<void>
  reload: () => Promise<void>
}

export const A = createContext<Ctx>(null as never)
export const useAdmin = () => useContext(A)