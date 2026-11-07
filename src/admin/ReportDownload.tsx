import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button } from '../components/ui'
import { Card } from './ui'
import { useAdmin } from './adminContext'
import { total, type AOrder } from './data'
import { naira, BATCHES } from '../data'

const monthKey = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = (k: string) =>
  new Date(`${k}-01T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
const cell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const esc = (v: string | number) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default function ReportDownload() {
  const { orders, settings } = useAdmin()
  const amount = (o: AOrder) => o.dbTotal ?? total(o, settings.zoboPrice, settings.puffPrice)
  const dayOf = (o: AOrder) => BATCHES.find((b) => b.id === o.batch)?.day ?? o.batch

  const months = useMemo(() => {
    const set = new Set(orders.map((o) => monthKey(o.placed)).filter(Boolean))
    set.add(monthKey(new Date().toISOString()))
    return [...set].sort().reverse()
  }, [orders])

  const [month, setMonth] = useState(months[0])
  const rows = orders.filter((o) => monthKey(o.placed) === month)
  const live = rows.filter((o) => o.stage !== 'cancelled')
  const paid = live.filter((o) => o.paid)
  const unpaid = live.filter((o) => !o.paid)
  const sum = (list: AOrder[]) => list.reduce((a, o) => a + amount(o), 0)
  const collected = sum(paid)

  const download = () => {
    const head = ['Order no', 'Placed', 'Customer', 'Phone', 'Batch', 'Type', 'Pepper', 'Plain', 'Zobo', 'Delivery fee', 'Total', 'Payment', 'Status']
    const lines = rows.map((o) => [
      o.no, new Date(o.placed).toLocaleString('en-NG'), o.name, o.phone, dayOf(o), o.mode,
      o.pepper, o.plain, o.zobo, o.mode === 'delivery' ? o.fee : 0, amount(o), o.paid ? 'Paid' : 'Unpaid', o.stage,
    ])
    const csv = [head, ...lines].map((r) => r.map(cell).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `turoob-orders-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const w = window.open('', '_blank')
    if (!w) { window.alert('Please allow pop-ups for this site, then try again.'); return }
    const stats: [string, string][] = [
      ['Orders (not cancelled)', String(live.length)],
      ['Money collected', naira(collected)],
      ['Awaiting payment', naira(sum(unpaid))],
      ['Average paid order', naira(paid.length ? Math.round(collected / paid.length) : 0)],
      ['Puff-puff ordered', `${live.reduce((a, o) => a + o.pepper + o.plain, 0)} pieces`],
      ['Zobo ordered', `${live.reduce((a, o) => a + o.zobo, 0)} bottles`],
      ['Pickups / deliveries', `${live.filter((o) => o.mode === 'pickup').length} / ${live.filter((o) => o.mode === 'delivery').length}`],
      ['Cancelled', String(rows.length - live.length)],
    ]
    const body = rows.map((o) => `<tr>
      <td>${esc(o.no)}</td><td>${esc(new Date(o.placed).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }))}</td>
      <td>${esc(o.name)}</td><td>${esc(dayOf(o))}</td><td>${esc(o.mode)}</td>
      <td>${esc([o.pepper && `${o.pepper} pepper`, o.plain && `${o.plain} plain`, o.zobo && `${o.zobo} zobo`].filter(Boolean).join(', '))}</td>
      <td class="r">${esc(naira(amount(o)))}</td><td>${o.paid ? 'Paid' : 'Unpaid'}</td><td>${esc(o.stage)}</td></tr>`).join('')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Turoob Pastries – ${esc(monthLabel(month))}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px}
        h1{margin:0;font-size:22px} .sub{color:#555;margin:4px 0 20px;font-size:13px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
        .box{border:1px solid #ddd;border-radius:8px;padding:10px} .box b{display:block;font-size:17px;margin-top:3px}
        .box span{font-size:11px;color:#555;text-transform:uppercase}
        table{width:100%;border-collapse:collapse;font-size:11.5px} th,td{border-bottom:1px solid #e5e5e5;padding:6px 5px;text-align:left}
        th{background:#f5f5f5} .r{text-align:right} tr{page-break-inside:avoid}
      </style></head><body>
      <h1>Turoob Pastries: orders report</h1>
      <p class="sub">${esc(monthLabel(month))} · generated ${esc(new Date().toLocaleString('en-NG'))}</p>
      <div class="grid">${stats.map(([k, v]) => `<div class="box"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Batch</th><th>Type</th><th>Items</th><th class="r">Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>${body}</tbody></table>
      </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Monthly report</h2>
      <p className="text-sm text-ink/70">Download every order placed in a month as a spreadsheet, or print it as a PDF.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 rounded-2xl border-2 border-yellow-light bg-white px-3 font-semibold outline-none focus:border-yellow-dark">
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <Button onClick={download} disabled={rows.length === 0}><Download className="size-4" />Download CSV</Button>
        <Button variant="secondary" onClick={printReport} disabled={rows.length === 0}><Printer className="size-4" />Print / PDF</Button>
        <p className="text-sm text-ink/70">{live.length} orders · {naira(collected)} collected</p>
      </div>
    </Card>
  )
}