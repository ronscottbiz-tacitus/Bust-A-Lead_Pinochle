import { useState } from 'react';
import { SEAT_LABEL, SUITS } from '../game/constants';
import { Play, Trophy, Skull, AlertTriangle, X, ArrowRight, RotateCcw } from 'lucide-react';

const money = (n) => `$${n.toFixed(2)}`;

const Overlay = ({ children, testid }) => (
  <div data-testid={testid} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
    {children}
  </div>
);

function Choice({ label, options, value, onChange, testidPrefix }) {
  return (
    <div className="w-full">
      <div className="text-[11px] font-sub uppercase tracking-widest text-slate-400 mb-1.5">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            data-testid={`${testidPrefix}-${o.value}`}
            onClick={() => onChange(o.value)}
            className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
              value === o.value
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 neon-cyan'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfigScreen({ state, act }) {
  const s = state.settings;
  const set = (patch) => act({ type: 'UPDATE_SETTINGS', settings: patch });
  return (
    <Overlay testid="config-screen">
      <div className="glass rounded-3xl p-6 sm:p-8 w-full max-w-md pop-in">
        <div className="text-center mb-5">
          <div className="font-display font-black text-3xl sm:text-4xl tracking-tight text-cyan-300">
            BUST<span className="text-fuchsia-400">·</span>A<span className="text-fuchsia-400">·</span>LEAD
          </div>
          <div className="text-xs font-sub uppercase tracking-[0.3em] text-slate-500 mt-1">
            Cutthroat Pinochle · 3 Seats
          </div>
        </div>
        <div className="space-y-4">
          <Choice
            label="Opening Bid Base"
            testidPrefix="cfg-bid"
            value={s.bidBase}
            onChange={(v) => set({ bidBase: v })}
            options={[
              { value: 60, label: '$60' },
              { value: 65, label: '$65' },
            ]}
          />
          <Choice
            label="Card Sorting"
            testidPrefix="cfg-sort"
            value={s.sortMode}
            onChange={(v) => set({ sortMode: v })}
            options={[
              { value: 'suit', label: 'By Suit' },
              { value: 'rank', label: 'By Rank' },
            ]}
          />
          <Choice
            label="Animation Speed"
            testidPrefix="cfg-speed"
            value={s.animSpeed}
            onChange={(v) => set({ animSpeed: v })}
            options={[
              { value: 'slow', label: 'Slow' },
              { value: 'normal', label: 'Normal' },
              { value: 'fast', label: 'Fast' },
            ]}
          />
          <Choice
            label="Sound"
            testidPrefix="cfg-sound"
            value={s.sound ? 'on' : 'off'}
            onChange={(v) => set({ sound: v === 'on' })}
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </div>
        <button
          data-testid="deal-btn"
          onClick={() => act({ type: 'START_ROUND' })}
          className="mt-6 w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-100 font-display font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-cyan-500/30 transition-all active:scale-95 neon-cyan"
        >
          <Play size={18} /> DEAL CARDS
        </button>
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
          {busted ? (
            <div className="shake">
              <Skull size={40} className="mx-auto text-red-400 mb-2" />
              <div className="font-display font-black text-2xl text-red-300">BUSTED A LEAD</div>
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
          <div className="bg-black/30 rounded-xl p-3 mb-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Bidder ({SEAT_LABEL[r.bidder]}) books</span>
              <span className="font-mono-stat">
                {r.bidderBooks} / {r.benchmark}
              </span>
            </div>
          </div>
        )}

        <div className="bg-black/30 rounded-xl p-3 mb-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Multiplier</div>
          <div className="flex items-center gap-2 flex-wrap">
            {r.multParts.length ? (
              r.multParts.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40">
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
          {r.transfers.map((t, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-0.5">
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
  'Trick rank high→low: A > 10 > K > Q > J.',
  'Each player is dealt 25 cards; 5 go to the Kitty. Everyone starts with $100.',
  'Bidding opens left of the dealer in $5 steps. If both opponents pass, the bid drops on the dealer at base.',
  'The winning bidder must expose a Marriage (K+Q) to name trump before touching the kitty. No marriage = Soft Set.',
  'Bidder takes the 5-card kitty (30 cards) then buries exactly 5 before card 1.',
  'Defenders score no meld but MUST declare Aces Around before their first card or Bust a Lead.',
  'Follow suit and head the trick if able; if void, trump and overtrump if able; else discard.',
  'Counters: every Ace, 10 and King captured = 1 book (48 total). Winner of trick 25 gets +2 (50 max).',
  'Bidder needs 20 books to save the hand (31 if Going Double), or it is a Hard Set.',
  'Busting a lead (out of turn / renege / undeclared aces) = immediate Hard Set on the offender.',
  'Settlement: Made +$1/defender · Soft Set −$1/defender · Hard Set −$2/defender.',
  'Multipliers compound: Going Double ×2 · Lay-Down Challenged ×2 · Spades Trump ×2.',
];

export function RulebookModal({ onClose }) {
  const [tab, setTab] = useState('rules');
  return (
    <Overlay testid="rulebook-modal">
      <div className="glass rounded-3xl p-5 sm:p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto pop-in relative">
        <button
          data-testid="close-rules-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="font-display font-bold text-xl text-cyan-300 mb-3">Rulebook & Meld Reference</div>
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
            {RULES.map((r, i) => (
              <li key={i} className="text-sm text-slate-300 leading-relaxed">
                {r}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-1.5">
            {MELD_REF.map(([name, pts], i) => (
              <li key={i} className="flex justify-between text-sm border-b border-white/5 pb-1">
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
