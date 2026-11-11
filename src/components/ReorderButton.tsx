import { RotateCw } from 'lucide-react'
import { Button } from './ui'
import { useApp } from '../store'
import { cartFromLines, type ReorderLine } from '../lib/reorder'

export default function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const { products, setCart, go, toast } = useApp()
  const run = () => {
    const { cart, skipped } = cartFromLines(lines, products)
    if (Object.keys(cart).length === 0) { toast('error', 'Those items are not available right now.'); return }
    setCart(cart)
    if (skipped > 0) toast('info', 'Some items are no longer available and were left out.')
    go('#/checkout')
  }
  return <Button variant="secondary" full onClick={run}><RotateCw className="size-4" />Order this again</Button>
}