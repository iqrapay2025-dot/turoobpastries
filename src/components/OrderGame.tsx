import { useCallback, useEffect, useRef, useState } from 'react'
import { Gamepad2, Trophy, Timer, Lightbulb, Puzzle, Calculator, LayoutGrid, Cookie, CupSoda, Flame, Star, Heart, Cherry, type LucideIcon } from 'lucide-react'
import { Button, cx } from './ui'
import { useApp } from '../store'
import { messageOf } from '../lib/orderView'
import { gameStatus, gameStart, gameSubmit, gameFlip, type GameKind, type GamePayload, type GameStatus, type SubmitResult } from '../lib/supabase'

const GAMES: Array<{ kind: GameKind; Icon: LucideIcon; title: string; text: string }> = [
  { kind: 'riddle', Icon: Lightbulb, title: 'Riddles', text: '3 riddles in 60 seconds. Get 2 right.' },
  { kind: 'puzzle', Icon: Puzzle, title: 'Puzzles', text: '3 brain teasers in 60 seconds. Get 2 right.' },
  { kind: 'math', Icon: Calculator, title: 'Math challenge', text: '3 quick sums in 45 seconds. Get 2 right.' },
  { kind: 'memory', Icon: LayoutGrid, title: 'Memory match', text: 'Match 6 pairs in 12 tries and 90 seconds.' },
]

// Memory cards come from the server as plain names; we draw flat icons.
const CARD_ICONS: Record<string, LucideIcon> = { cookie: Cookie, cup: CupSoda, flame: Flame, star: Star, heart: Heart, cherry: Cherry }

const Shell = ({ children }: { children: React.ReactNode }) => (
  <section className="mt-5 rounded-[28px] bg-white p-6 shadow-soft">{children}</section>
)

/* ------------------------------------------------------------ countdown */
function useCountdown(seconds: number, onExpire: () => void) {
  const end = useRef(Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  const expire = useRef(onExpire)
  expire.current = onExpire
  useEffect(() => {
    let fired = false
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((end.current - Date.now()) / 1000))
      setLeft(s)
      if (s === 0 && !fired) { fired = true; clearInterval(t); expire.current() }
    }, 250)
    return () => clearInterval(t)
  }, [])
  return left
}

function TimerBar({ left, total }: { left: number; total: number }) {
  const urgent = left <= 10
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className={cx('inline-flex items-center gap-1.5', urgent ? 'text-red' : 'text-ink')}><Timer className="size-4" />{left}s left</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-yellow-light">
        <div className={cx('h-full rounded-full transition-[width] duration-300 ease-linear', urgent ? 'bg-red' : 'bg-yellow')} style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
      </div>
    </div>
  )
}

type Outcome = { won: boolean; awarded: boolean; note?: string }

/* ------------------------------------------------------------ quiz (riddle / puzzle / math) */
function Quiz({ token, game, onDone }: { token: string; game: Extract<GamePayload, { questions: unknown }>; onDone: (r: Outcome) => void }) {
  const { toast } = useApp()
  const [i, setI] = useState(0)
  const answers = useRef<string[]>([])
  const [busy, setBusy] = useState(false)
  const sent = useRef(false)
  const q = game.questions[i]

  const submit = async (timedOut: boolean) => {
    if (sent.current) return
    sent.current = true
    setBusy(true)
    try {
      const r: SubmitResult = await gameSubmit(token, answers.current)
      onDone({ won: r.won, awarded: r.awarded, note: r.timed_out || timedOut ? `Time’s up! You got ${r.correct} of ${r.total}. You needed 2.` : `You got ${r.correct} of ${r.total}. You needed 2.` })
    } catch (e) {
      toast('error', messageOf(e))
      onDone({ won: false, awarded: false, note: 'Time’s up!' })
    }
  }

  const left = useCountdown(game.seconds_left, () => { void submit(true) })

  const pick = (opt: string) => {
    if (busy) return
    answers.current = [...answers.current, opt]
    if (i + 1 < game.questions.length) setI(i + 1)
    else void submit(false)
  }

  const total = Math.max(game.seconds_left, 1)
  return (
    <div>
      <TimerBar left={left} total={total} />
      <p className="text-xs font-bold uppercase tracking-wider text-red">Question {i + 1} of {game.questions.length}</p>
      <p className="mt-2 font-display text-xl font-semibold">{q.question}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => (
          <button key={o} disabled={busy} onClick={() => pick(o)} className="min-h-12 rounded-2xl border-2 border-yellow bg-yellow-light/50 px-4 text-left font-semibold transition hover:bg-yellow active:scale-[.98] disabled:opacity-60">{o}</button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ memory match */
function Memory({ token, game, onDone }: { token: string; game: Extract<GamePayload, { kind: 'memory' }>; onDone: (r: Outcome) => void }) {
  const { toast } = useApp()
  const [shown, setShown] = useState<Record<number, string>>(() => Object.fromEntries(game.matched.map((m) => [m.idx, m.symbol])))
  const [matched, setMatched] = useState<Set<number>>(() => new Set(game.matched.map((m) => m.idx)))
  const [pending, setPending] = useState<number | null>(null)
  const [moves, setMoves] = useState(game.moves)
  const [busy, setBusy] = useState(false)
  const over = useRef(false)

  const end = (r: Outcome) => { if (over.current) return; over.current = true; onDone(r) }
  const left = useCountdown(game.seconds_left, () => end({ won: false, awarded: false, note: 'Time’s up! No free puff-puff this time.' }))

  const flip = async (idx: number) => {
    if (busy || over.current || matched.has(idx) || pending === idx) return
    setBusy(true)
    try {
      const r = await gameFlip(token, idx)
      if (r.timed_out) { end({ won: false, awarded: false, note: 'Time’s up! No free puff-puff this time.' }); return }
      const sym = r.symbol as string
      setShown((s) => ({ ...s, [idx]: sym }))
      if (r.phase === 'first') { setPending(idx); setBusy(false); return }
      setMoves(r.moves ?? moves + 1)
      const first = r.first as number
      if (r.match) {
        setMatched((m) => new Set([...m, first, idx]))
        setPending(null)
        if (r.done) { setTimeout(() => end({ won: !!r.won, awarded: !!r.awarded }), 700); return }
        setBusy(false)
      } else {
        setTimeout(() => {
          setShown((s) => { const n = { ...s }; delete n[first]; delete n[idx]; return n })
          setPending(null)
          if (r.done) end({ won: false, awarded: false, note: 'You used all 12 tries. No free puff-puff this time.' }); else setBusy(false)
        }, 900)
      }
    } catch (e) { toast('error', messageOf(e)); setBusy(false) }
  }

  return (
    <div>
      <TimerBar left={left} total={Math.max(game.seconds_left, 1)} />
      <p className="text-sm font-semibold">Tries used: <span className="text-red">{moves}</span> of {game.max_moves}</p>
      <div className="mx-auto mt-3 grid max-w-xs grid-cols-4 gap-2">
        {Array.from({ length: game.size }, (_, idx) => {
          const face = shown[idx]
          const Icon = face ? CARD_ICONS[face] : undefined
          return (
            <button key={idx} onClick={() => flip(idx)} disabled={busy && !face} aria-label={face ? `Card ${idx + 1}: ${face}` : `Card ${idx + 1}, face down`}
              className={cx('grid aspect-square place-items-center rounded-2xl border-2 transition', face ? 'border-yellow bg-yellow-light text-red' : 'border-red bg-red text-white hover:-translate-y-0.5', matched.has(idx) && 'opacity-60')}>
              {Icon ? <Icon className="size-7" strokeWidth={2.25} /> : face ? null : <Gamepad2 className="size-6 opacity-80" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ the card on the order page */
export default function OrderGame({ token }: { token: string }) {
  const { toast } = useApp()
  const [st, setSt] = useState<GameStatus | null>(null)
  const [game, setGame] = useState<GamePayload | null>(null)
  const [busy, setBusy] = useState<GameKind | null>(null)
  const [result, setResult] = useState<Outcome | null>(null)

  const refresh = useCallback(async () => {
    try { setSt(await gameStatus(token)) } catch (e) { console.error('Game status failed:', e) }
  }, [token])
  useEffect(() => { void refresh() }, [refresh])

  const start = async (kind: GameKind) => {
    setBusy(kind)
    try { setGame(await gameStart(token, kind)) } catch (e) { toast('error', messageOf(e)); void refresh() } finally { setBusy(null) }
  }
  // Came back mid-game (page reloaded): the clock kept running, so continue with what is left.
  const resume = async () => { if (st?.kind) await start(st.kind) }

  const finish = (r: Outcome) => { setGame(null); setResult(r); void refresh() }

  if (!st || !st.enabled) return null

  if (result) {
    return (
      <Shell>
        <div className="text-center">
          <Trophy className={cx('mx-auto size-10', result.won ? 'text-red' : 'text-ink/40')} />
          {result.won && result.awarded ? (
            <>
              <h2 className="mt-2 text-xl font-semibold">You won a free puff-puff!</h2>
              <p className="mt-1 text-sm text-ink-soft">Show your QR code when you collect your order and we will add it.</p>
            </>
          ) : result.won ? (
            <><h2 className="mt-2 text-xl font-semibold">You won!</h2><p className="mt-1 text-sm text-ink-soft">Today’s free puff-puffs have all been given out, so there is no prize this time. Well played!</p></>
          ) : (
            <><h2 className="mt-2 text-xl font-semibold">So close!</h2><p className="mt-1 text-sm text-ink-soft">{result.note ?? 'No free puff-puff this time. Try again with your next order.'}</p></>
          )}
        </div>
      </Shell>
    )
  }

  if (game) {
    return (
      <Shell>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Gamepad2 className="size-5 text-red" />Win a free puff-puff</h2>
        {game.kind === 'memory'
          ? <Memory token={token} game={game} onDone={finish} />
          : <Quiz token={token} game={game} onDone={finish} />}
      </Shell>
    )
  }

  // Already finished earlier (e.g. they reloaded the page).
  if (st.status === 'won') {
    return (
      <Shell>
        <div className="text-center">
          <Trophy className="mx-auto size-10 text-red" />
          {(st.bonus_puffs ?? 0) > 0
            ? <><h2 className="mt-2 text-xl font-semibold">You won a free puff-puff!</h2><p className="mt-1 text-sm text-ink-soft">Show your QR code when you collect your order and we will add it.</p></>
            : <><h2 className="mt-2 text-xl font-semibold">You won!</h2><p className="mt-1 text-sm text-ink-soft">Today’s free puff-puffs ran out, so there is no prize this time.</p></>}
        </div>
      </Shell>
    )
  }
  if (st.status === 'lost') return null
  if (!st.eligible) return null

  if (st.status === 'playing') {
    return (
      <Shell>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Gamepad2 className="size-5 text-red" />Game in progress</h2>
        <p className="mt-1 text-sm text-ink-soft">You started a game for this order. The clock kept running, so continue with the time you have left.</p>
        <div className="mt-4"><Button onClick={resume} loading={!!busy}>Continue</Button></div>
      </Shell>
    )
  }

  if (st.prizes_left === false) {
    return <Shell><p className="text-center text-sm text-ink-soft">Today’s free puff-puff games are finished. Come back with your next order!</p></Shell>
  }

  return (
    <Shell>
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Gamepad2 className="size-5 text-red" />Waiting? Win a free puff-puff</h2>
      <p className="mt-1 text-sm text-ink-soft">Pick a game while we prepare your order. Beat the clock and we add one free puff-puff. One try per order.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {GAMES.map(({ kind, Icon, title, text }) => (
          <button key={kind} disabled={!!busy} onClick={() => start(kind)} className="flex items-center gap-3 rounded-2xl border-2 border-yellow bg-yellow-light/50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-yellow disabled:opacity-60">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red text-white"><Icon className="size-5" /></span>
            <span><b className="block">{title}</b><span className="text-sm text-ink-soft">{text}</span></span>
          </button>
        ))}
      </div>
    </Shell>
  )
}