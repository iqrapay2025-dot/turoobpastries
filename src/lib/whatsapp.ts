import type { AOrder } from '../admin/data'

/** Turns a Nigerian number in any common written form into "234XXXXXXXXXX", or null if it can't. */
export function toWaNumber(phone: string): string | null {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (d.startsWith('234') && d.length === 13) return d
  if (d.startsWith('0') && d.length === 11) return '234' + d.slice(1)
  if (d.length === 10) return '234' + d
  return null
}

/** A wa.me link that opens a WhatsApp chat with the message already typed. */
export function waLink(phone: string, text: string): string | null {
  const n = toWaNumber(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null
}

/** A ready-to-send message for the customer, based on where their order is. */
export function orderMessage(o: AOrder, pickupPlace: string): string {
  const hi = `Hi ${o.name}, this is Turoob Pastries.`
  switch (o.stage) {
    case 'awaiting':
      return `${hi} We have confirmed the delivery fee for order ${o.no}. Please check your email to accept it and pay.`
    case 'paid':
      return `${hi} We have received your payment for order ${o.no}. Thank you!`
    case 'preparing':
      return `${hi} We are preparing your order ${o.no}.`
    case 'out':
      return `${hi} Your order ${o.no} is on its way to you. Please keep your phone nearby.`
    case 'ready':
      return `${hi} Your order ${o.no} is ready for pickup at ${pickupPlace}. See you soon!`
    case 'completed':
      return `${hi} Thank you for ordering with us! We hope you enjoyed order ${o.no}.`
    default:
      return `${hi} Thanks for your order ${o.no}.`
  }
}