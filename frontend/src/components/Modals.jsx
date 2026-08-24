import { useState } from 'react';
import { SEAT_LABEL, SEATS } from '../game/constants';
import { computeMeld } from '../game/meld';
import { Card } from './Card';
import { Play, Trophy, Skull, AlertTriangle, X, ArrowRight, RotateCcw, BarChart3, History, RefreshCw, Home, Layers } from 'lucide-react';

const money = (n) => `$${n.toFixed(2)}`;
const GTA_PANEL = 'bg-zinc-950/95 border-2 border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-md';

export function MeldDrawer({ state, onClose }) {
  const s = state;
  if (!s.bidWinner) return null;
  let meld;
  if (s.phase === 'discard' && s.bidWinner === 'P') {
    const dset = new Set(s.discards);
    meld = computeMeld(s.hands.P.filter((c) => !dset.has(c.id)), s.trump);
  } else {
    meld = s.meld[s.bidWinner] || { items: [], total: 0 };
  }
  return (
    <div data-testid="meld-drawer" className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-zinc-950/97 border-l-2 border-amber-500/50 shadow-2xl p-5 overflow-y-auto float-up">
        <button
          data-testid="close-meld-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 border border-amber-500/30 text-amber-200 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Layers size={18} />
          <div className="font-display font-black text-lg uppercase tracking-wide">{SEAT_LABEL[s.bidWinner]}'s Meld</div>
        </div>
        <div className="text-4xl font-mono-stat font-black text-amber-300 mb-4">{meld.total} pts</div>
        {meld.items.length === 0 ? (
          <div className="text-slate-400 text-sm">No meld in hand.</div>
        ) : (
          <ul className="space-y-2">
            {meld.items.map((it) => (
              <li
                key={it.name}
                data-testid={`meld-item-${it.name.replace(/\s+/g, '-').toLowerCase()}`}
                className="flex justify-between items-center border-b border-amber-500/10 pb-2"
              >
                <span className="text-slate-200 text-sm">{it.name}</span>
                <span className="font-mono-stat font-bold text-amber-300">+{it.pts}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 pt-3 border-t border-amber-500/30 flex justify-between font-black uppercase text-sm tracking-wide">
          <span className="text-slate-100">Total Meld</span>
          <span className="font-mono-stat text-amber-300">{meld.total}</span>
        </div>
        {s.bidderAcesPending && (
          <div className="mt-3 text-xs text-amber-200/80">
            Aces Around pending — declare before leading an Ace to add {s.bidderAcesItem?.pts || 10} pts.
          </div>
        )}
      </div>
    </div>
  );
}

const Overlay = ({ children, testid }) => (
  <div data-testid={testid} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
    {children}
  </div>
);

function Choice({ label, options, value, onChange, testidPrefix }) {
  return (
    <div className="w-full">
      <div className="text-[11px] font-sub uppercase tracking-widest text-amber-500/70 mb-1.5">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            data-testid={`${testidPrefix}-${o.value}`}
            onClick={() => onChange(o.value)}
            className={`px-2 py-2 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
              value === o.value
                ? 'bg-amber-500 border-amber-400 text-black shadow-[0_3px_0_rgba(0,0,0,0.6)]'
                : 'bg-neutral-900/80 border-neutral-700 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const CFG_DIFFICULTY = [
  { value: 'easy', label: 'New Booty' },
  { value: 'normal', label: 'Inmate' },
  { value: 'hard', label: 'Convict' },
];
const CFG_BID = [
  { value: 60, label: '60' },
  { value: 65, label: '65' },
];
const CFG_SORT = [
  { value: 'suit', label: 'By Suit' },
  { value: 'rank', label: 'By Rank' },
];
const CFG_SPEED = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
];
const CFG_SOUND = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];
const CFG_STAKES = [
  { value: 1, label: 'Low $1/$2' },
  { value: 2, label: 'Mid $2/$4' },
  { value: 5, label: 'High $5/$10' },
];

export function ConfigScreen({ state, act }) {
  const s = state.settings;
  const set = (patch) => act({ type: 'UPDATE_SETTINGS', settings: patch });
  return (
    <Overlay testid="config-screen">
      <div className="rounded-3xl overflow-hidden w-full max-w-lg pop-in max-h-[92vh] overflow-y-auto border-2 border-amber-600/50 bg-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.9),0_28px_70px_rgba(0,0,0,0.75)]">
        <div className="relative">
          <img
            src="/assets/splash2_bal.png"
            alt="Bus' a Lead — CDCR yard card table"
            data-testid="splash-hero"
            className="w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/10 to-transparent pointer-events-none" />
        </div>
        <div className="px-6 sm:px-8 pb-7 pt-2">
          <div
            className="text-center text-[11px] sm:text-xs font-sub font-bold uppercase tracking-[0.26em] text-amber-500/90 mb-5"
            data-testid="gta-subtitle"
          >
            Cutthroat Pinochle • CDCR Prison Rules
          </div>
          <div className="space-y-4">
            <Choice
              label="Difficulty"
              testidPrefix="cfg-difficulty"
              value={s.difficulty || 'normal'}
              onChange={(v) => set({ difficulty: v })}
              options={CFG_DIFFICULTY}
            />
            <Choice
              label="Opening Bid Base"
              testidPrefix="cfg-bid"
              value={s.bidBase}
              onChange={(v) => set({ bidBase: v })}
              options={CFG_BID}
            />
            <Choice
              label="Card Sorting"
              testidPrefix="cfg-sort"
              value={s.sortMode}
              onChange={(v) => set({ sortMode: v })}
              options={CFG_SORT}
            />
            <Choice
              label="Animation Speed"
              testidPrefix="cfg-speed"
              value={s.animSpeed}
              onChange={(v) => set({ animSpeed: v })}
              options={CFG_SPEED}
            />
            <Choice
              label="Sound"
              testidPrefix="cfg-sound"
              value={s.sound ? 'on' : 'off'}
              onChange={(v) => set({ sound: v === 'on' })}
              options={CFG_SOUND}
            />
            <Choice
              label="Table Stakes"
              testidPrefix="cfg-stakes"
              value={s.stakesBase || 1}
              onChange={(v) => set({ stakesBase: v })}
              options={CFG_STAKES}
            />
          </div>
          <button
            data-testid="deal-btn"
            onClick={() => act({ type: 'START_ROUND' })}
            className="mt-6 w-full py-3 rounded-xl bg-amber-500 border-2 border-black/70 text-black font-display font-black tracking-wide flex items-center justify-center gap-2 hover:bg-amber-400 transition-all active:scale-95 shadow-[0_6px_0_rgba(0,0,0,0.6)]"
          >
            <Play size={18} /> DEAL CARDS
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export function SettlementModal({ state, act }) {
  const s = state;
  const r = s.settlement;
  if (!r) return null;
  const busted = r.result === 'busted';
  const win = r.transfers.some((t) => t.to === 'P');
  return (
    <Overlay testid="settlement-modal">
      <div
        className={`rounded-3xl p-6 sm:p-8 w-full max-w-md pop-in border-2 ${
          busted
            ? 'bg-gradient-to-b from-red-950 to-slate-950 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)]'
            : win
            ? 'bg-gradient-to-b from-emerald-950/80 to-slate-950 border-emerald-500 neon-cyan'
            : 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-600'
        }`}
      >
        <div className="text-center mb-4">
          {r.boardSet ? (
            <div data-testid="board-set-banner" className="shake">
              <Skull size={40} className="mx-auto text-orange-400 mb-2" />
              <div className="font-display font-black text-2xl text-orange-300">BOARD SET</div>
              <div className="text-xs text-orange-200/80 mt-1">
                Impossible Contract — Books Needed ({(r.bid ?? 0) - (r.meldTotal ?? 0)}) exceed 50. Automatic Hard Set.
              </div>
            </div>
          ) : busted ? (
            <div className="shake">
              <Skull size={40} className="mx-auto text-red-400 mb-2" />
              <div data-testid="settlement-title" className="font-display font-black text-2xl text-red-300">
                {String(r.busted.reason).includes('FALSE ACCUSATION')
                  ? 'FALSE ACCUSATION'
                  : String(r.busted.reason).includes('RENEGE CONFIRMED')
                  ? 'RENEGE CONFIRMED'
                  : String(r.busted.reason).includes('RENEGE')
                  ? "BUS' A LEAD VIOLATION"
                  : 'BUSTED A LEAD'}
              </div>
              <div className="text-xs text-red-200/80 mt-1">
                {SEAT_LABEL[r.busted.seat]}: {r.busted.reason}
              </div>
            </div>
          ) : (
            <>
              {win ? (
                <Trophy size={40} className="mx-auto text-yellow-400 mb-2" />
              ) : (
                <AlertTriangle size={40} className="mx-auto text-slate-400 mb-2" />
              )}
              <div className="font-display font-black text-2xl text-slate-100">{r.label}</div>
            </>
          )}
        </div>

        {!busted && (
          <div className="bg-black/30 rounded-xl p-3 mb-3 text-sm space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Bidder ({SEAT_LABEL[r.bidder]}) Books Won</span>
              <span className="font-mono-stat text-emerald-300">
                {r.bidderBooks} / {r.benchmark}
              </span>
            </div>
            <div className="flex justify-between text-slate-400 text-xs">
              <span>Bid {r.bid ?? ''} · Meld {r.meldTotal ?? 0}</span>
              <span className="font-mono-stat">Books to Save: {r.benchmark}</span>
            </div>
          </div>
        )}

        <div className="bg-black/30 rounded-xl p-3 mb-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Multiplier</div>
          <div className="flex items-center gap-2 flex-wrap">
            {r.multParts.length ? (
              r.multParts.map((p) => (
                <span key={p} className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40">
                  {p}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Base ×1</span>
            )}
            <span className="ml-auto font-mono-stat font-bold text-yellow-300">Total ×{r.mult}</span>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-3 mb-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Transfers</div>
          {r.transfers.map((t) => (
            <div key={`${t.from}-${t.to}`} className="flex items-center justify-between text-sm py-0.5">
              <span className="text-rose-300">{SEAT_LABEL[t.from]}</span>
              <ArrowRight size={14} className="text-slate-500" />
              <span className="text-emerald-300">{SEAT_LABEL[t.to]}</span>
              <span className="font-mono-stat font-bold text-yellow-300 ml-2">{money(t.amount)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {['W', 'E', 'P'].map((k) => (
            <div key={k} className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">{SEAT_LABEL[k]}</div>
              <div className="font-mono-stat font-bold text-emerald-300 text-sm">{money(r.newBankrolls[k])}</div>
            </div>
          ))}
        </div>

        {r.gameOver ? (
          <button
            data-testid="new-game-btn"
            onClick={() => act({ type: 'NEW_GAME' })}
            className="w-full py-3 rounded-xl bg-yellow-500/20 border border-yellow-400 text-yellow-100 font-display font-bold flex items-center justify-center gap-2 hover:bg-yellow-500/30 active:scale-95"
          >
            <RotateCcw size={18} /> GAME OVER · NEW GAME
          </button>
        ) : (
          <button
            data-testid="next-hand-btn"
            onClick={() => act({ type: 'NEXT_HAND' })}
            className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-100 font-display font-bold flex items-center justify-center gap-2 hover:bg-cyan-500/30 active:scale-95 neon-cyan"
          >
            <ArrowRight size={18} /> NEXT HAND
          </button>
        )}
      </div>
    </Overlay>
  );
}

const MELD_REF = [
  ['Off-Suit Marriage (K+Q)', '2'],
  ['Royal Trump Marriage', '4'],
  ['4-Suit Marriage (Roundhouse)', '24'],
  ['Trump Run (A 10 K Q J)', '15'],
  ['Double Trump Run', '150'],
  ['Pinochle (Q♠ + J♦)', '4'],
  ['Double Pinochle', '40'],
  ['Aces Around', '10'],
  ['Double Aces (1000)', '100'],
  ['Kings Around', '8'],
  ['Double Kings', '80'],
  ['Queens Around', '6'],
  ['Double Queens', '60'],
  ['Jacks Around', '4'],
  ['Double Jacks', '40'],
];

const RULES = [
  'Deck: 80 cards (two pinochle decks, 9s removed). 4 copies of 10-J-Q-K-A in every suit.',
  'Book (card) rank high→low: A > 10 > K > Q > J.',
  'Each player is dealt 25 cards; 5 go to the Kitty. Everyone starts with $100.',
  'Bidding opens left of the dealer in $5 steps. If both opponents pass, the bid drops on the dealer at base.',
  'The winning bidder must expose a Marriage (K+Q) to name trump before touching the kitty. No marriage = Soft Set.',
  'Bidder takes the 5-card kitty (30 cards) then buries exactly 5 before card 1.',
  'Defenders score no meld but MUST declare Aces Around before their first card or Bust a Lead.',
  'Follow suit and head the book if able; if void, trump and overtrump if able; else you may only slough off-suit.',
  'Counters: every Ace, 10 and King captured = 1 book (48 total). Winner of book 25 gets +2 (50 max).',
  'Books to Save = Max(20, Bid − Meld) — 31 floor if Going Double. Fewer books = Hard Set.',
  'Busting a lead (out of turn / renege / undeclared aces) = immediate Hard Set on the offender.',
  'Settlement (scaled by table stakes): Made +1/defender · Soft Set −1/defender · Hard Set −2/defender.',
  'Multipliers compound: Going Double ×2 · Lay-Down Challenged ×2 · Spades Trump ×2.',
];

export function StatsModal({ stats, onClose, onReset }) {
  const st = stats || { handsPlayed: 0, handsMade: 0, softSets: 0, hardSets: 0, biggestPot: 0, bestStreak: 0, net: { W: 0, E: 0, P: 0 } };
  const rows = [
    ['Hands Played', st.handsPlayed],
    ['Hands Made', st.handsMade],
    ['Soft Sets', st.softSets],
    ['Hard Sets', st.hardSets],
    ['Biggest Pot Won', `$${(st.biggestPot || 0).toFixed(2)}`],
    ['Best Win Streak', `${st.bestStreak || 0}`],
  ];
  return (
    <Overlay testid="stats-modal">
      <div className={`${GTA_PANEL} p-5 sm:p-6 w-full max-w-md pop-in relative`}>
        <button
          data-testid="close-stats-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 border border-amber-500/30 text-amber-200 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="font-display font-black text-xl text-amber-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <BarChart3 size={20} /> Session Stats
        </div>
        <div className="space-y-1.5 mb-4">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm border-b border-white/5 pb-1">
              <span className="text-slate-300">{label}</span>
              <span data-testid={`stat-${label.replace(/\s+/g, '-').toLowerCase()}`} className="font-mono-stat font-bold text-emerald-300">
                {val}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Lifetime Net P&amp;L</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {SEATS.map((k) => (
            <div key={k} className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">{SEAT_LABEL[k]}</div>
              <div className={`font-mono-stat font-bold text-sm ${st.net[k] >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {st.net[k] >= 0 ? '+' : '−'}${Math.abs(st.net[k]).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <button
          data-testid="reset-stats-btn"
          onClick={onReset}
          className="w-full py-2 rounded-xl bg-slate-800/60 border border-slate-600 text-slate-300 font-sub font-semibold text-sm hover:bg-slate-700/60 flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} /> Reset Stats
        </button>
      </div>
    </Overlay>
  );
}

export function RulebookModal({ onClose }) {
  const [tab, setTab] = useState('rules');
  return (
    <Overlay testid="rulebook-modal">
      <div className={`${GTA_PANEL} p-5 sm:p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto pop-in relative`}>
        <button
          data-testid="close-rules-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 border border-amber-500/30 text-amber-200 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="font-display font-black text-xl text-amber-400 uppercase tracking-wide mb-3">Rulebook &amp; Meld Reference</div>
        <div className="flex gap-2 mb-4">
          {[
            ['rules', 'Rules'],
            ['meld', 'Meld Values'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                tab === id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'rules' ? (
          <ol className="space-y-2 list-decimal list-inside">
            {RULES.map((r) => (
              <li key={r} className="text-sm text-slate-300 leading-relaxed">
                {r}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-1.5">
            {MELD_REF.map(([name, pts]) => (
              <li key={name} className="flex justify-between text-sm border-b border-white/5 pb-1">
                <span className="text-slate-300">{name}</span>
                <span className="font-mono-stat font-bold text-yellow-300">{pts}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Overlay>
  );
}


export function BookReplayModal({ completedBooks, onClose }) {
  const books = completedBooks || [];
  const [sel, setSel] = useState(books.length ? books.length - 1 : 0);
  const book = books[sel];
  return (
    <Overlay testid="book-replay-modal">
      <div className={`${GTA_PANEL} p-5 sm:p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto pop-in relative`}>
        <button
          data-testid="close-history-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 border border-amber-500/30 text-amber-200 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="font-display font-black text-xl text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <History size={20} /> Book History
        </div>
        {books.length === 0 ? (
          <div className="text-sm text-slate-400">No books played yet.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {books.map((b, i) => (
                <button
                  key={b.book}
                  data-testid={`book-chip-${b.book}`}
                  onClick={() => setSel(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono-stat font-bold border transition-all ${
                    sel === i ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 neon-cyan' : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  {b.book}
                </button>
              ))}
            </div>
            {book && (
              <div data-testid="book-replay-detail" className="bg-black/30 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-3 flex justify-between">
                  <span>Book {book.book} · Led by {SEAT_LABEL[book.leader]}</span>
                  <span className="text-emerald-300 font-bold">{SEAT_LABEL[book.winner]} won (+{book.pts})</span>
                </div>
                <div className="flex justify-center gap-4">
                  {book.plays.map((p) => (
                    <div key={p.card.id} className="flex flex-col items-center gap-1">
                      <div className={`text-[10px] font-mono-stat ${p.seat === book.winner ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                        {SEAT_LABEL[p.seat]}
                        {p.seat === book.leader ? ' ▸' : ''}
                      </div>
                      <Card card={p.card} size="md" className={p.seat === book.winner ? 'ring-2 ring-emerald-400' : ''} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}

export function NewGameConfirmModal({ onRedeal, onMainMenu, onCancel }) {
  return (
    <Overlay testid="new-game-modal">
      <div className={`${GTA_PANEL} p-6 sm:p-7 w-full max-w-sm pop-in text-center`}>
        <RefreshCw size={36} className="mx-auto text-amber-400 mb-3" />
        <div className="font-display font-black text-xl text-amber-300 uppercase tracking-wide mb-2">New Game</div>
        <p className="text-sm text-slate-300 mb-5">Choose how you want to restart. Both options reset all bankrolls to <b className="text-emerald-300">$100.00</b>.</p>
        <div className="flex flex-col gap-2.5">
          <button
            data-testid="redeal-table-btn"
            onClick={onRedeal}
            className="w-full py-3 rounded-xl bg-amber-500 text-black font-display font-black uppercase tracking-wide hover:bg-amber-400 active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} /> Redeal Table
          </button>
          <button
            data-testid="main-menu-btn"
            onClick={onMainMenu}
            className="w-full py-3 rounded-xl bg-zinc-800 border border-amber-500/40 text-amber-100 font-display font-bold uppercase tracking-wide hover:bg-zinc-700 active:scale-95 flex items-center justify-center gap-2"
          >
            <Home size={18} /> Return to Main Menu
          </button>
          <button
            data-testid="cancel-new-game-btn"
            onClick={onCancel}
            className="w-full py-2 rounded-xl bg-transparent border border-zinc-700 text-slate-400 font-sub font-semibold hover:bg-zinc-800/60"
          >
            Cancel
          </button>
        </div>
      </div>
    </Overlay>
  );
}

