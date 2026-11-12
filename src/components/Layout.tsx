import { useState, useEffect, type ReactNode } from 'react'
import { ShoppingBag, Menu, X, Camera, Mail, ShieldCheck, ArrowRight } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import { useApp } from '../store'
import { Button, Toasts, cx } from './ui'
import { naira } from '../data'
import logo from '../assets/logo.jpg'

export const WA = 'https://wa.me/2347087936401?text=Hi%20Turoob%20Pastries!'

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88zM20.52 3.45A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.46z" />
    </svg>
  )
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <a href="#/" className="flex shrink-0 items-center gap-2">
      <img src={logo} alt="Turoob Pastries" className="h-11 w-auto object-contain transition duration-300 hover:-rotate-3 hover:scale-105" />
      <span className={cx('font-display text-xl font-semibold leading-none max-[380px]:hidden', light && 'text-white', !light && 'text-ink')}>Turoob<span className={cx('block text-xs font-medium tracking-[.2em] uppercase', light ? 'text-yellow' : 'text-red')}>Pastries</span></span>
    </a>
  )
}

export function useSection() {
  const { go, route } = useApp()
  return (id: string) => {
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    if (route === '#/' || route === '') scroll()
    else { go('#/'); setTimeout(scroll, 120) }
  }
}

export function Header() {
  const { count, go, route, anyOpen } = useApp()
  const [open, setOpen] = useState(false)
  const section = useSection()
  const links: [string, () => void][] = [
     ['Home', () => go('#/')],
    ['Order', () => go('#/order')],
    ['Meet the Team', () => section('team')],
    ['Reviews', () => section('reviews')],
        ['FAQ', () => section('faq')],
    ['My orders', () => go('#/my-orders')],
  ]
  const mobileLinks: [string, () => void][] = [...links, ['Track my order', () => go('#/status')]]

  // Close the menu whenever the page changes.
  useEffect(() => { setOpen(false) }, [route])

  // Escape closes the menu, and the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const cart = (
    <button aria-label={`Cart, ${count} items`} onClick={() => go('#/order')} className="relative grid size-11 place-items-center rounded-full bg-white shadow-soft transition hover:bg-yellow-light">
      <ShoppingBag className="size-5" />
      {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red px-1 text-xs font-bold text-white">{count}</span>}
    </button>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-yellow-light bg-cream shadow-soft">
      <div className="mx-auto flex h-17 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([l, fn]) => <button key={l} onClick={fn} className={cx('min-h-11 rounded-full px-4 text-[15px] font-semibold transition hover:bg-yellow-light', ((l === 'Order' && route.startsWith('#/order')) || (l === 'Home' && (route === '#/' || route === ''))) && 'bg-yellow-light')}>{l}</button>)}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="md" disabled={!anyOpen} onClick={() => go('#/order')} className="hidden md:inline-flex">Pre-order now</Button>
          {cart}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
            className="grid size-11 place-items-center rounded-full bg-ink text-white lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* dimmed backdrop: tap to close */}
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-x-0 bottom-0 top-17 bg-ink/40 lg:hidden" />
          <div id="mobile-menu" className="pop-in absolute inset-x-0 top-full max-h-[calc(100dvh-68px)] overflow-y-auto border-t border-yellow-light bg-cream px-4 pb-5 pt-2 shadow-pop lg:hidden">
            {mobileLinks.map(([l, fn]) => (
              <button key={l} onClick={() => { setOpen(false); fn() }} className="flex min-h-14 w-full items-center justify-between border-b border-yellow-light py-3 font-display text-xl font-medium">
                {l}<ArrowRight className="size-5 text-red" />
              </button>
            ))}
            <Button full size="lg" className="mt-4" disabled={!anyOpen} onClick={() => { setOpen(false); go('#/order') }}>{!anyOpen ? 'Orders closed' : 'Pre-order now'}</Button>
          </div>
        </>
      )}
    </header>
  )
}

export function Footer() {
  const section = useSection()
  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-white/70">Hot, fresh puff-puff fried every Friday, Saturday and Sunday. Made by students, for Ilorin.</p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"><ShieldCheck className="size-4 text-yellow" />Powered by Paystack</span>
        </div>
        <div>
          <h4 className="mb-3 text-lg text-yellow">Quick links</h4>
          <ul className="text-white/80">
            <li><a href="#/order" className="flex min-h-11 items-center hover:text-yellow">Order</a></li>
                        <li><a href="#/status" className="flex min-h-11 items-center hover:text-yellow">Track my order</a></li>
            <li><a href="#/my-orders" className="flex min-h-11 items-center hover:text-yellow">My orders</a></li>
            <li><a href="#/admin" className="flex min-h-11 items-center hover:text-yellow">Team login</a></li>
            <li><button onClick={() => section('team')} className="flex min-h-11 items-center hover:text-yellow">Meet the Team</button></li>
            <li><button onClick={() => section('faq')} className="flex min-h-11 items-center hover:text-yellow">FAQ</button></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-lg text-yellow">Say hello</h4>
          <ul className="text-white/80">
            <li className="flex min-h-11 items-center gap-2"><WhatsAppIcon className="size-4 text-yellow" />WhatsApp: +2347087936401</li>
            <li><a href="https://instagram.com/turoobpastries" target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 hover:text-yellow"><Camera className="size-4 text-yellow" />@turoobpastries</a></li>
            <li><a href="mailto:turoobpastries@gmail.com" className="flex min-h-11 items-center gap-2 hover:text-yellow"><Mail className="size-4 text-yellow" />turoobpastries@gmail.com</a></li>
            <a href="#/privacy">Privacy Policy</a> · <a href="#/terms">Terms of Service</a>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-sm text-white/70">© 2026 Turoob Pastries, Ilorin, Kwara State. All rights reserved.</div>
    </footer>
  )
}

export function WhatsAppFab() {
  const { count, route } = useApp()
  const hasCartBar = count > 0 && route.startsWith('#/order')
  return (
    <a href={WA} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"
      className={cx('group fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-ink px-4 text-white shadow-pop transition hover:bg-ink-soft sm:right-6', hasCartBar ? 'bottom-28 lg:bottom-6' : 'bottom-5 sm:bottom-6')}>
      <span className="grid size-9 place-items-center rounded-full bg-yellow text-ink"><WhatsAppIcon className="size-5" /></span>
      <span className="hidden pr-1 text-sm font-semibold sm:inline">Chat with us</span>
    </a>
  )
}

export function CartBar() {
  const { count, subtotal, go, closed, route } = useApp()
  if (count === 0 || !route.startsWith('#/order')) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden">
      <div className="on-dark pop-in mx-auto flex max-w-lg items-center justify-between gap-3 rounded-full bg-ink p-2 pl-5 text-white shadow-pop">
        <div className="leading-tight"><p className="text-xs text-white/60">{count} {count === 1 ? 'item' : 'items'}</p><p className="font-display text-xl font-semibold text-yellow">{naira(subtotal)}</p></div>
        <Button disabled={closed} onClick={() => go('#/checkout')}>Checkout<ArrowRight className="size-4" /></Button>
      </div>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Analytics />
      <Header />
      {children}
      <Footer />
      <CartBar />
      <WhatsAppFab />
      <Toasts />
    </>
  )
}
