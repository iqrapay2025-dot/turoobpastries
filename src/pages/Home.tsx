import t1 from '../assets/team-t1.jpg'
import t2 from '../assets/team-t2.jpg'
import t3 from '../assets/team-t3.jpg'
import jumah from '../assets/jumah muhammed.jpg'
import abdulazeez from '../assets/abdulazeez adegbite.jpg'
import ademola from '../assets/Ademola Khalif.jpg'
import muhammadulawwal from '../assets/Muhammadulawwal Abdulsamod.jpg'
import { useRef, useState, useEffect } from 'react'     
import { ArrowRight, UtensilsCrossed, Truck, ShieldCheck, Cookie, MapPin, ChevronLeft, ChevronRight, Gamepad2 } from 'lucide-react'
import { useApp } from '../store'
import { fetchProducts, fetchReviews, fetchTeamMembers } from '../lib/supabase'
import { Button, SectionTitle, Sparkle } from '../components/ui'
import { BatchBanner, BatchPicker, ProductCard } from '../components/Blocks'
import { FAQ, IMG } from '../data'
import Loader from '../components/Loader'
import opatola from '../assets/Opatola Abbas.jpg'

/* ---------------------------------------------------------------- Referral promo */
function ReferralPromo() {
  const { go, anyOpen } = useApp()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-[28px] bg-red p-5 text-white shadow-pop sm:flex-row sm:items-center sm:p-6">
        <p className="flex items-center gap-3 font-display text-xl font-semibold sm:text-2xl">
          <Gamepad2 className="size-6 shrink-0 text-yellow" />Refer friends from your hostel
        </p>
        <Button variant="yellow" disabled={!anyOpen} onClick={() => go('#/order')}>
          {anyOpen ? 'Order and refer' : 'Orders closed'}
        </Button>
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
                    <p className="mt-5 max-w-lg text-lg text-ink-soft">Pre-order for Friday, Saturday or Sunday. Pick up at Central Mosque or get it delivered. Golden, fluffy, still warm.</p>
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
  [UtensilsCrossed, 'Choose', 'With or without pepper.'],
  [Truck, 'Pickup or delivery', 'Collect it or get it brought to you.'],
  [ShieldCheck, 'Pay', 'Card, transfer, USSD or OPay.'],
  [Cookie, 'Enjoy', 'Fresh and hot.'],
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
      <SectionTitle eyebrow="Meet the Team" title="The hands behind the fryer"/>
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
      <SectionTitle eyebrow="Customer reviews" title="What our customers say"/>
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
  { name: 'Ajibola James', where: '500L, Biomedical Engineering', rating: 5, text: 'It feels homemade.' },
  { name: 'Anonymous', where: '500L', rating: 4, text: "I love the spicy puff puff, it's 10/10." },
  { name: 'Anonymous', where: '500L', rating: 5, text: 'Unique taste and succulence.' },
  { name: 'Abubakar Ahmad Abdumumeen', where: '500L, Computer Engineering', rating: 5, text: 'It has the right amount of fluffiness and sweetness.' },
  { name: 'Anonymous', where: '500L', rating: 4, text: "The puff puff is nice and filling, and it wasn't too sugary." },
  { name: 'Adedeji Abdulhammed Adewale', where: '500L, Biomedical Engineering', rating: 5, text: 'Your product is good, honestly.' },
  { name: 'Anonymous', where: '500L', rating: 5, text: 'It had the right amount of sweetener. It was just perfect.' },
  { name: 'Busari Iqbal', where: '500L, Civil Engineering', rating: 5, text: 'The taste.' },
  { name: 'Anonymous', where: '400L', rating: 5, text: 'The hotness of it.' },
  { name: 'Anonymous', where: '500L', rating: 5, text: 'The flavour is rich. It tastes good.' },
]

const FALLBACK_TEAM: TeamMember[] = [
  { name: 'AbdulAzeez Adegbite Ayomide', role: 'Founder and Head of Operations', img: abdulazeez },
  { name: 'Ademola Khalif', role: 'Operations Manager', img: ademola },
  { name: 'Muhammadulawwal Abdulsamod', role: 'Inventory & Production Coordinator', img: muhammadulawwal },
  { name: 'Jumah Muhammed O.', role: 'Digital Communications & Tech Lead', img: jumah },
    { name: 'Opatola Abass', role: 'Customer Relations & Logistics Officer', img: opatola },
  { name: 'Yisau Shukroh', role: 'Packaging & Distribution Associate', img: t1 },
  { name: 'Fatimah Salahudeen', role: 'Production & Packaging Associate', img: t2 },
  { name: 'Masruroh Fasasi', role: 'Packaging & Presentation Associate', img: t3 },
]

/* Supabase rows use slightly different field names than the UI, so map them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProduct = (p: any) => {
  const name: string = p.name ?? ''
  const lower = name.toLowerCase()
  const isDrink = lower.includes('zobo') || lower.includes('tigernut')
  const fallbackImg = lower.includes('tigernut') ? IMG.tigernut : lower.includes('zobo') ? IMG.zobo : lower.includes('without') ? IMG.plain : IMG.pepper
  return {
    ...p,
    desc: p.desc ?? p.description ?? '',
    img: p.img ?? p.image_url ?? fallbackImg,
        unit: p.unit ?? (isDrink ? 'bottle' : 'piece'),
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
          where: x.where ?? (x.is_verified ? 'Verified order' : ''),
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
      <ReferralPromo />

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
          <SectionTitle eyebrow="The menu" title="Fresh from the fryer"/>
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
            {/* <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <SectionTitle eyebrow="Watch" title="Hot out of the fryer" sub="A peek at how every batch is made." />
        <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] bg-ink shadow-pop sm:max-w-md">
          <video
            src={puffVideo}
            className="block max-h-[80vh] w-full bg-ink object-contain"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            aria-label="Puff-puff being fried fresh"
          />
        </div>
      </section> */}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 rounded-[28px] bg-red p-6 text-white shadow-pop sm:p-8 md:grid-cols-3">
                    {[['Pickup', 'Free', 'Central Mosque'], ['On-campus delivery', 'from ₦100', 'Unilorin and the College of Health Sciences'], ['Off-campus delivery', 'from ₦200', 'Fee confirmed before payment']].map(([t, p, d]) => (
            <div key={t} className="flex items-start gap-4 rounded-2xl bg-white/10 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/20">
              <MapPin className="mt-1 size-6 shrink-0 text-yellow" />
              <div><p className="text-sm font-semibold text-white">{t}</p><p className="font-display text-3xl font-semibold">{p}</p><p className="mt-1 text-sm text-white">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="This weekend" title="Pick your fry day"/>
        <BatchPicker />
      </section>

      <Team members={activeTeam} />

      <Reviews items={activeReviews} />

      <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
        <SectionTitle eyebrow="FAQ" title="Questions? We have answers"/>
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