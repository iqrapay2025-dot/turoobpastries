import { useCallback, useEffect, useState } from 'react'
import { Gamepad2, Trophy } from 'lucide-react'
import { Button, cx } from './ui'
import { useApp } from '../store'
import { messageOf } from '../lib/orderView'
import { gameStatus, gameStart, gameSubmit, gameFlip, type GameKind, type GamePayload, type GameStatus, type SubmitResult } from '../lib/supabase'

const GAMES: Array<{ kind: GameKind; emoji: string; title: string; text: string }> = [
  { kind: 'riddle', emoji: '🧩', title: 'Riddles', text: '3 riddles. Get 2 right.' },
  { kind: 'puzzle', emoji: '🔢', title: 'Puzzles', text: '3 brain teasers. Get 2 right.' },
  { kind: 'math', emoji: '➕', title: 'Math challenge', text: '3 quick sums. Get 2 right.' },
  { kind: 'memory', emoji: '🃏', title: 'Memory match', text: 'Match all 6 pairs in 12 tries.' },
]

const Shell = ({ children }: { children: React.ReactNode }) => (
  <section className="mt-5 rounded-[28px] bg-white p-6 shadow-soft">{children}</section>
)

/* ------------------------------------------------------------ quiz (riddle / puzzle / math) */
function Quiz({ token, game, onDone }: { token: string; game: Extract<GamePayload, { questions: unknown }>; onDone: (r: SubmitResult) => void }) {
  const { toast } = useApp()
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const q = game.questions[i]

  const pick = async (opt: string) => {
    if (busy) return
    const next = [...answers, opt]
    if (i + 1 < game.questions.length) { setAnswers(next); setI(i + 1); return }
    setBusy(true)
    try { onDone(await gameSubmit(token, next)) } catch (e) { toast('error', messageOf(e)); setBusy(false) }
  }

  return (
    <div>
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
function Memory({ token, game, onDone }: { token: string; game: Extract<GamePayload, { kind: 'memory' }>; onDone: (won: boolean, awarded: boolean) => void }) {
  const { toast } = useApp()
  const [shown, setShown] = useState<Record<number, string>>(() => Object.fromEntries(game.matched.map((m) => [m.idx, m.symbol])))
  const [matched, setMatched] = useState<Set<number>>(() => new Set(game.matched.map((m) => m.idx)))
  const [pending, setPending] = useState<number | null>(null)
  const [moves, setMoves] = useState(game.moves)
  const [busy, setBusy] = useState(false)

  const flip = async (idx: number) => {
    if (busy || matched.has(idx) || pending === idx) return
    setBusy(true)
    try {
      const r = await gameFlip(token, idx)
      setShown((s) => ({ ...s, [idx]: r.symbol }))
      if (r.phase === 'first') { setPending(idx); setBusy(false); return }
      setMoves(r.moves ?? moves + 1)
      const first = r.first as number
      if (r.match) {
        setMatched((m) => new Set([...m, first, idx]))
        setPending(null)
        if (r.done) { setTimeout(() => onDone(!!r.won, !!r.awarded), 700); return }
        setBusy(false)
      } else {
        setTimeout(() => {
          setShown((s) => { const n = { ...s }; delete n[first]; delete n[idx]; return n })
          setPending(null)
          if (r.done) onDone(false, false); else setBusy(false)
        }, 900)
      }
    } catch (e) { toast('error', messageOf(e)); setBusy(false) }
  }

  return (
    <div>
      <p className="text-sm font-semibold">Tries used: <span className="text-red">{moves}</span> of {game.max_moves}</p>
      <div className="mx-auto mt-3 grid max-w-xs grid-cols-4 gap-2">
        {Array.from({ length: game.size }, (_, idx) => {
          const face = shown[idx]
          return (
            <button key={idx} onClick={() => flip(idx)} disabled={busy && !face} aria-label={face ? `Card ${idx + 1}: ${face}` : `Card ${idx + 1}`}
              className={cx('grid aspect-square place-items-center rounded-2xl border-2 text-3xl transition', face ? 'border-yellow bg-yellow-light' : 'border-red/30 bg-red text-white hover:-translate-y-0.5', matched.has(idx) && 'opacity-70')}>
              {face ?? '?'}
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
  const [result, setResult] = useState<{ won: boolean; awarded: boolean; note?: string } | null>(null)

  const refresh = useCallback(async () => {
    try { setSt(await gameStatus(token)) } catch (e) { console.error('Game status failed:', e) }
  }, [token])
  useEffect(() => { void refresh() }, [refresh])

  const start = async (kind: GameKind) => {
    setBusy(kind)
    try { setGame(await gameStart(token, kind)) } catch (e) { toast('error', messageOf(e)); void refresh() } finally { setBusy(null) }
  }
  // Came back mid-game (page reloaded): offer to continue.
  const resume = async () => { if (st?.kind) await start(st.kind) }

  const finish = (r: { won: boolean; awarded: boolean; note?: string }) => { setGame(null); setResult(r); void refresh() }

  if (!st || !st.enabled) return null

  if (result) {
    return (
      <Shell>
        <div className="text-center">
          <Trophy className={cx('mx-auto size-10', result.won ? 'text-red' : 'text-ink/40')} />
          {result.won && result.awarded ? (
            <>
              <h2 className="mt-2 text-xl font-semibold">You won a free puff-puff! 🎉</h2>
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
          ? <Memory token={token} game={game} onDone={(won, awarded) => finish({ won, awarded })} />
          : <Quiz token={token} game={game} onDone={(r) => finish({ won: r.won, awarded: r.awarded, note: `You got ${r.correct} of ${r.total}. You needed 2.` })} />}
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
            ? <><h2 className="mt-2 text-xl font-semibold">You won a free puff-puff! 🎉</h2><p className="mt-1 text-sm text-ink-soft">Show your QR code when you collect your order and we will add it.</p></>
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
        <p className="mt-1 text-sm text-ink-soft">You started a game for this order. Pick up where you left off.</p>
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
      <p className="mt-1 text-sm text-ink-soft">Pick a game while we prepare your order. Win and we add one free puff-puff. One try per order.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {GAMES.map((g) => (
          <button key={g.kind} disabled={!!busy} onClick={() => start(g.kind)} className="flex items-center gap-3 rounded-2xl border-2 border-yellow bg-yellow-light/50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-yellow disabled:opacity-60">
            <span className="text-3xl" aria-hidden>{g.emoji}</span>
            <span><b className="block">{g.title}</b><span className="text-sm text-ink-soft">{g.text}</span></span>
          </button>
        ))}
      </div>
    </Shell>
  )
}