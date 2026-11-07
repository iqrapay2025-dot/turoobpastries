import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useApp, type Order } from '../store'
import { Button, Notice } from '../components/ui'

export function PayButton({ order, label = 'Pay now with Paystack' }: { order: () => Order | null; label?: string }) {
  const { preview, setOrder, go, toast, clear } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const pay = () => {
    const o = order()
    if (!o) return
    setLoading(true); setError(false)
    setTimeout(() => {
      setLoading(false)
      if (preview.payFail) { setError(true); toast('error', 'Payment was not completed'); return }
      setOrder({ ...o, status: 0, feeConfirmed: true }); clear(); toast('success', 'Payment received. Thank you!')
      go('#/confirmation')
    }, 1800)
  }
  return (
    <div className="space-y-3">
      {error && <Notice tone="error" title="We could not complete your payment">Your card was not charged. Check your details or try another method, then try again.</Notice>}
      <Button full size="lg" loading={loading} onClick={pay}><Lock className="size-4" />{loading ? 'Connecting to Paystack…' : error ? 'Try payment again' : label}</Button>
      <p className="text-center text-sm font-medium text-ink-soft">Pay with card, bank transfer, USSD or OPay</p>
      <p className="text-center text-xs text-ink/70">Secured by Paystack</p>
    </div>
  )
}
