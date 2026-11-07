import { createContext, useContext } from 'react'
import type { AOrder, Settings } from './data'

export type SlotsByDay = Record<'fri' | 'sat' | 'sun', string[]>

export type Ctx = {
  orders: AOrder[]
  setOrders: (f: (o: AOrder[]) => AOrder[]) => void
  settings: Settings
  setSettings: (s: Settings) => void
  seen: Set<string>
  markSeen: (no: string) => void
  slotsByDay: SlotsByDay
  saveSettings: (s: Settings, slots: SlotsByDay) => Promise<void>
  setStage: (no: string, stage: string) => Promise<void>
  markPaidManually: (no: string) => Promise<void>
  confirmFee: (no: string, fee: number) => Promise<void>
  reload: () => Promise<void>
}

export const A = createContext<Ctx | null>(null)

export const useAdmin = (): Ctx => {
  const c = useContext(A)
  if (!c) throw new Error('useAdmin must be used inside AdminApp')
  return c
}