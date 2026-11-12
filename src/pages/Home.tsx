import t1 from '../assets/team-t1.jpg'
import t2 from '../assets/team-t2.jpg'
import t3 from '../assets/team-t3.jpg'
import jumah from '../assets/jumah muhammed.jpg'
import abdulazeez from '../assets/abdulazeez adegbite.jpg'
import { useRef, useState, useEffect } from 'react'     
import { ArrowRight, UtensilsCrossed, Truck, ShieldCheck, Cookie, MapPin, ChevronLeft, ChevronRight, Gamepad2, Lightbulb, Puzzle, Calculator, LayoutGrid, Timer } from 'lucide-react'
import { useApp } from '../store'
import { fetchProducts, fetchReviews, fetchTeamMembers } from '../lib/supabase'
import { Button, SectionTitle, Sparkle } from '../components/ui'
import { BatchBanner, BatchPicker, ProductCard } from '../components/Blocks'
import { FAQ, IMG } from '../data'
import Loader from '../components/Loader'

/* ---------------------------------------------------------------- Game announcement */
function GameAnnouncement() {
  const { go, anyOpen } = useApp()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="relative overflow-hidden rounded-[28px] bg-red p-6 text-white shadow-pop sm:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink"><Gamepad2 className="size-4" />New</span>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">Play while we fry. Win a free puff-puff.</h2>
            <p className="mt-2 max-w-xl text-white/90">After you pay, pick a game while your order is being prepared: riddles, puzzles, a math challenge or memory match. Beat the clock and we add one extra puff-puff to your order.</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
              {([[Lightbulb, 'Riddles'], [Puzzle, 'Puzzles'], [Calculator, 'Math'], [LayoutGrid, 'Memory match']] as const).map(([Icon, label]) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Icon className="size-4" />{label}</li>
              ))}
              <li className="inline-flex items-center gap-1.5 rounded-full bg-yellow px-3 py-1.5 text-ink"><Timer className="size-4" />Against the clock</li>
            </ul>
            <p className="mt-3 text-xs text-white/80">One try per paid order. Limited free puff-puffs each day.</p>
          </div>
          <div className="md:text-right">
            <Button variant="yellow" size="lg" disabled={!anyOpen} onClick={() => go('#/order')}>{anyOpen ? 'Order and play' : 'Orders closed'}<ArrowRight className="size-5" /></Button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- Hero */
function Hero() {
  const { go, anyOpen } = useApp()
  const closed = !anyOpen
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-2 lg:pb-16 lg:pt-14">
        <div>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-yellow px-4 py-1.5 text-sm font-bold"><Cookie className="size-4" />Made by Unilorin students</span>
          <h1 className="text-[44px] font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">Hot, fresh <span className="text-red">puff-puff.</span> Friday, Saturday and Sunday.</h1>
          <p className="mt-5 max-w-lg text-lg text-ink-soft">Order for Friday, Saturday or Sunday, then pick up at Central Mosque or have it delivered across campus and off-campus, golden, fluffy and still warm.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={closed} onClick={() => go('#/order')}>{closed ? 'Orders closed' : 'Pre-order now'}<ArrowRight className="size-5" /></Button>
            <Button size="lg" variant="secondary" onClick={() => go('#/status')}>Track my order</Button>
          </div>
          {closed && <p className="mt-3 text-sm font-semibold text-red-dark">Orders are closed right now. Each day opens at 6pm the evening before and closes at 7am.</p>}
        </div>
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -inset-3 rotate-3 rounded-[48px] bg-yellow" />
          <img src={IMG.hero} alt="Golden brown puff-puff on a white plate" className="relative transition duration-500 hover:rotate-1 hover:scale-[1.02] aspect-5/4 w-full rounded-[40px] object-cover shadow-pop lg:aspect-square" />
          <Sparkle className="-left-4 top-6 size-8" /><Sparkle className="-right-3 bottom-16 size-6 [animation-delay:1s]" /><Sparkle className="right-10 -top-5 size-5 [animation-delay:1.8s]" />
          <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-pop">
            <span className="grid size-10 place-items-center rounded-full bg-red font-display font-bold text-white">₦</span>
            <span className="leading-tight"><b className="font-display text-lg">₦100</b><span className="block text-xs text-ink/70">per piece</span></span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- Steps */
const STEPS = [
  [UtensilsCrossed, 'Choose your puff-puff', 'With or without pepper. Add Zobo when it is in.'],
  [Truck, 'Pick pickup or delivery', 'Collect at Central Mosque or get it brought to you.'],
  [ShieldCheck, 'Pay securely', 'Card, bank transfer, USSD or OPay via Paystack.'],
  [Cookie, 'Enjoy it hot', 'Fried fresh after Jumah, handed over still warm.'],
] as const

/* ------------------------------------------------------------ Carousel */
function Carousel({ children, cardW }: { children: React.ReactNode[]; cardW: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const n = children.length
  const goTo = (to: number) => {
    const el = ref.current
    if (!el) return
    const k = Math.max(0, Math.min(n - 1, to))
    el.scrollTo({ left: k * (cardW + 16), behavior: 'smooth' })
    setI(k)
  }
  return (
    <div>
      <div
        ref={ref}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / (cardW + 16)))}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0"
      >
        {children}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-soft sm:hidden" aria-live="polite">{i + 1} / {n}</p>
          <div className="hidden sm:flex">
            {children.map((_, k) => (
              <button key={k} aria-label={`Go to slide ${k + 1}`} aria-current={k === i} onClick={() => goTo(k)} className="group/dot grid size-11 place-items-center rounded-full">
                <span className={'block h-2.5 rounded-full transition-all ' + (k === i ? 'w-8 bg-red' : 'w-2.5 bg-red-light group-hover/dot:bg-red')} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button aria-label="Previous" disabled={i === 0} onClick={() => goTo(i - 1)} className="grid size-12 place-items-center rounded-full bg-white shadow-soft transition hover:-translate-x-0.5 hover:bg-yellow active:scale-95 disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:bg-white"><ChevronLeft /></button>
          <button aria-label="Next" disabled={i === n - 1} onClick={() => goTo(i + 1)} className="grid size-12 place-items-center rounded-full bg-red text-white shadow-soft transition hover:translate-x-0.5 hover:bg-red-dark active:scale-95 disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:bg-red"><ChevronRight /></button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Team */
type TeamMember = { name: string; role: string; img: string }

function Team({ members }: { members: TeamMember[] }) {
  return (
    <section id="team" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionTitle eyebrow="Meet the Team" title="The hands behind the fryer" sub="A small crew of Unilorin students, frying with love every Friday." />
      <Carousel cardW={220}>
        {members.map((m, i) => (
          <div key={m.name} className="group w-55 shrink-0 snap-start overflow-hidden rounded-[28px] bg-white text-center shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-pop">
            <div className="relative p-3 pb-0">
              <img src={m.img} alt={m.name} loading="lazy" className="aspect-square w-full rounded-[22px] object-cover object-[50%_30%] transition duration-500 group-hover:scale-[1.03]" />
              {i === 0 && <span className="absolute left-5 top-5 rounded-full bg-yellow px-3 py-1 text-xs font-bold">Founder</span>}
            </div>
            <div className="p-4"><h3 className="text-base font-semibold leading-snug">{m.name}</h3><p className="mt-1 text-sm text-red">{m.role}</p></div>
          </div>
        ))}
      </Carousel>
    </section>
  )
}

/* ------------------------------------------------------------- Reviews */
type Review = { name: string; where: string; rating: number; text: string }

function Reviews({ items }: { items: Review[] }) {
  return (
    <section id="reviews" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <SectionTitle eyebrow="Customer reviews" title="What our customers say" sub="Slide through to read more." />
      <Carousel cardW={320}>
        {items.map((r) => (
          <article key={r.name + r.text} className="flex w-[320px] shrink-0 snap-start flex-col rounded-[28px] bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-pop">
            <div className="mb-3 flex items-center gap-1" aria-label={`${r.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={'text-base ' + (star <= r.rating ? 'text-yellow' : 'text-ink/20')}>★</span>
              ))}
            </div>
            <p className="mb-4 flex-1 text-sm text-ink-soft">{r.text}</p>
            <div>
              <p className="text-sm font-semibold text-ink">{r.name}</p>
              {r.where && <p className="text-xs text-ink/70">{r.where}</p>}
            </div>
          </article>
        ))}
      </Carousel>
    </section>
  )
}
/* ------------------------------------------------------------ Fallbacks */
// Placeholder content is only used for reviews and team members.
const FALLBACK_REVIEWS: Review[] = [
  { name: 'Fatima A.', where: '300L, Law', rating: 5, text: 'The pepper one is dangerous. I ordered 20 for my hostel and we finished them before Asr.' },
  { name: 'Tunde O.', where: '200L, Engineering', rating: 5, text: 'Still hot when I picked up after Jumah. Pre-ordering saved me from the queue.' },
  { name: 'Maryam S.', where: 'Staff, Faculty of Arts', rating: 4, text: 'Soft, sweet and not oily. Delivery to my office was on time.' },
  { name: 'Ibrahim K.', where: '400L, Sciences', rating: 5, text: 'Cleanest ordering experience on campus. Paid with OPay in seconds.' },
  { name: 'Hauwa B.', where: '100L, Pharmacy', rating: 5, text: 'Best puff-puff in Ilorin, honestly. Love that I can order for Saturday too!' },
]

const FALLBACK_TEAM: TeamMember[] = [
  { name: 'AbdulAzeez Adegbite Ayomide', role: 'Founder and Head Fryer', img: abdulazeez },
  { name: 'Ademola Khalif', role: 'Team member', img: 'https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&q=80&fit=crop' },
  { name: 'Muhammadulawwal Abdulsamod', role: 'Team member', img: 'https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&q=80&fit=crop' },
  { name: 'Jumah Muhammed O.', role: 'Team member', img: jumah },
  { name: 'Opatola Abass', role: 'Team member', img: 'https://images.unsplash.com/photo-1546525848-3ce03ca516f6?w=600&q=80&fit=crop' },
  { name: 'Yisau Shukroh', role: 'Team member', img: t1 },
  { name: 'Fatimah Salahudeen', role: 'Team member', img: t2 },
  { name: 'Masruroh Fasasi', role: 'Team member', img: t3 },
]

/* Supabase rows use slightly different field names than the UI, so map them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProduct = (p: any) => {
  const name: string = p.name ?? ''
  const lower = name.toLowerCase()
  const fallbackImg = lower.includes('zobo') ? IMG.zobo : lower.includes('without') ? IMG.plain : IMG.pepper
  return {
    ...p,
    desc: p.desc ?? p.description ?? '',
    img: p.img ?? p.image_url ?? fallbackImg,
    unit: p.unit ?? (lower.includes('zobo') ? 'bottle' : 'piece'),
    partner: p.partner ?? p.partner_name ?? undefined,
  }
}

/* ---------------------------------------------------------------- Home */
export default function Home() {
  const { go } = useApp()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [productsError, setProductsError] = useState(false)
  const [loading, setLoading] = useState(true)
  // Minimum time the loader is shown so it is actually visible before content renders.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [p, r, t] = await Promise.allSettled([fetchProducts(), fetchReviews(), fetchTeamMembers()])
      if (!alive) return

      if (p.status === 'fulfilled' && Array.isArray(p.value)) setProducts(p.value.map(toProduct))
      else setProductsError(true)

      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setReviews(r.value.map((x: any) => ({
          name: x.name ?? x.author_name ?? 'Customer',
          where: x.where ?? '',
          rating: x.rating ?? 5,
          text: x.text ?? x.comment ?? '',
        })))
      }

      if (t.status === 'fulfilled' && Array.isArray(t.value)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTeam(t.value.map((x: any) => ({
          name: x.name,
          role: x.role ?? 'Team member',
          img: x.img ?? x.photo_url ?? FALLBACK_TEAM[0].img,
        })))
      }
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const activeReviews = reviews.length > 0 ? reviews : FALLBACK_REVIEWS
  const activeTeam = team.length > 0 ? team : FALLBACK_TEAM

  return (
    <main>
      <Hero />
      <div className="mx-auto max-w-6xl px-4 sm:px-6"><BatchBanner /></div>
      <GameAnnouncement />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="How it works" title="Four steps to warm puff-puff" center />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([Icon, t, d], i) => (
            <div key={t} className="group relative rounded-[28px] bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-pop">
              <span className="absolute right-5 top-4 font-display text-5xl font-bold text-yellow-light">{i + 1}</span>
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-red text-white transition duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-yellow group-hover:text-ink"><Icon className="size-7" /></span>
              <h3 className="text-lg font-semibold">{t}</h3><p className="mt-1 text-sm text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-yellow-light/50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="The menu" title="Fresh from the fryer" sub="Simple, honest and golden. Add Zobo to your order when it is in season." />
          {productsError ? (
            <p className="rounded-2xl bg-white p-6 text-center font-semibold text-red-dark shadow-soft">
              Couldn’t load the menu. Please refresh the page.
            </p>
          ) : loading || !loaded ? (
            <Loader label="Loading the menu…" />
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {products.map((p) => <ProductCard key={p.id} p={p} preview />)}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 rounded-[28px] bg-red p-6 text-white shadow-pop sm:p-8 md:grid-cols-3">
          {[['Pickup', 'Free', 'Central Mosque, University of Ilorin'], ['On-campus delivery', 'from ₦100', 'To your hostel, faculty or office'], ['Off-campus delivery', 'from ₦200', 'Final fee confirmed before payment']].map(([t, p, d]) => (
            <div key={t} className="flex items-start gap-4 rounded-2xl bg-white/10 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/20">
              <MapPin className="mt-1 size-6 shrink-0 text-yellow" />
              <div><p className="text-sm font-semibold text-white">{t}</p><p className="font-display text-3xl font-semibold">{p}</p><p className="mt-1 text-sm text-white">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="This weekend" title="Pick your fry day" sub="Friday, Saturday and Sunday batches. Each closes at 7am on the day, so order the night before." />
        <BatchPicker />
      </section>

      <Team members={activeTeam} />

      <Reviews items={activeReviews} />

      <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="FAQ" title="Questions? We have answers" sub="Slide through the most common questions." />
        <Carousel cardW={320}>
          {FAQ.map(([q, a], i) => (
            <article key={q} className="flex w-[320px] shrink-0 snap-start flex-col rounded-[28px] bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-pop">
              <span className="mb-4 grid size-11 place-items-center rounded-full bg-yellow font-display text-lg font-semibold">{i + 1}</span>
              <h3 className="text-xl font-semibold leading-snug">{q}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{a}</p>
            </article>
          ))}
        </Carousel>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl bg-yellow p-8 text-center sm:p-12">
          <div className="relative">
            <h2 className="text-3xl font-semibold sm:text-5xl">Hungry already?</h2>
            <p className="mx-auto mt-2 max-w-md">Lock in your puff-puff before each 7am batch cutoff.</p>
            <Button size="lg" variant="dark" className="mt-6" onClick={() => go('#/order')}>Pre-order now<ArrowRight className="size-5" /></Button>
          </div>
        </div>
      </section>
    </main>
  )
}