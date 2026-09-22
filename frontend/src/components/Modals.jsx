import { useState, useEffect, useCallback, useMemo } from 'react';
import { SEAT_LABEL, SEATS } from '../game/constants';
import { CHARACTERS, PLAYER_PICKS, ROSTER_IDS, buildSeatChars } from '../config/characters';
import { computeMeld } from '../game/meld';
import { Card } from './Card';
import { videoSources, CUTSCENE_LIBRARY } from './CutsceneOverlay';
import { Play, Trophy, Skull, AlertTriangle, X, ArrowRight, RotateCcw, BarChart3, History, RefreshCw, Home, Layers, Gavel, ShieldAlert, Film, SkipForward, ChevronLeft, ChevronRight, LayoutGrid, PlayCircle, Coins, Heart, Flag } from 'lucide-react';

const money = (n) => `$${n.toFixed(2)}`;

function renegeTaunt(busted) {
  if (!busted) return null;
  const reason = String(busted.reason);
  const opp = busted.seat === 'W' ? SEAT_LABEL.E : SEAT_LABEL.W;
  const me = SEAT_LABEL.P;
  if (reason.includes('FALSE ACCUSATION')) return `${opp}: Ain't nobody renege, ${me} — sit yo' paranoid self down.`;
  if (reason.includes('RENEGE CONFIRMED')) return `${SEAT_LABEL[busted.seat]}: Man… ${me} got eyes in the back of his head.`;
  if (reason.includes('RENEGE') || reason.includes('VIOLATION')) return `${opp}: Caught you slippin', ${me}! That's a bus' a lead.`;
  return null;
}
const GTA_PANEL = 'bg-zinc-950/95 border-2 border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-md';

export function MeldDrawer({ state, onClose }) {
  const s = state;
  const [openItem, setOpenItem] = useState(null);
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
            {meld.items.map((it) => {
              const tid = it.name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
              const open = openItem === it.name;
              return (
                <li key={it.name} className="border-b border-amber-500/10 pb-2">
                  <button
                    data-testid={`meld-item-${tid}`}
                    onClick={() => setOpenItem(open ? null : it.name)}
                    className="w-full flex justify-between items-center text-left hover:text-amber-100"
                  >
                    <span className="text-slate-200 text-sm flex items-center gap-1.5">
                      <span className={`text-amber-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                      {it.name}
                    </span>
                    <span className="font-mono-stat font-bold text-amber-300">+{it.pts}</span>
                  </button>
                  {open && (
                    <div data-testid={`meld-cards-${tid}`} className="mt-2 flex flex-wrap gap-1 pl-4 pop-in">
                      {it.cards.map((c) => (
                        <Card key={c.id} card={c} size="sm" />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
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
  { value: 'easy', label: 'New Fish' },
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
const CFG_TAUNTS = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Muted' },
];
const CFG_BOLDNESS = [
  { value: 'cautious', label: 'Cautious' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'bold', label: 'Bold' },
];
const CFG_RENEGE = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
];
const CFG_TUTORIAL = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];
const CFG_STAKES = [
  { value: 1, label: 'Low $1/$2' },
  { value: 2, label: 'Mid $2/$4' },
  { value: 5, label: 'High $5/$10' },
];
// "Skillz" — defensive tactical rating of the AI syndicate (independent of Difficulty).
const CFG_SKILL = [
  { value: 'dumptruck', label: 'Dump Truck' },
  { value: 'alight', label: "Al'ight" },
  { value: 'shooter', label: 'Shooter' },
];
const SKILL_BLURB = {
  dumptruck: 'Casual · 65% Tactical Rating — plays selfish, bleeds counters, ignores partner voids.',
  alight: "Standard · 75% Tactical Rating — runs the syndicate playbook most of the time.",
  shooter: 'Cutthroat · 100% Tactical Rating — counter starvation, void cuts, ace-hunting. Every book.',
};
const GET2_URL = 'https://get2.one';

const FEEDBACK_URL = 'https://forms.gle/j9aMWdxqwYjYWjzz5';

// "Pick Your Hustler" — 3-card selector for the human's seat (G2 / Baby Boy / Scrap).
function HustlerSelect({ value, onChange }) {
  return (
    <div data-testid="hustler-select">
      <div className="text-[11px] font-sub font-black uppercase tracking-[0.22em] text-amber-500/90 mb-2">
        Pick Your Hustler
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PLAYER_PICKS.map((id) => {
          const c = CHARACTERS[id];
          const active = value === id;
          return (
            <button
              key={id}
              data-testid={`hustler-${id}`}
              onClick={() => onChange(id)}
              className={`relative rounded-xl overflow-hidden border-2 text-left transition-all active:scale-95 ${
                active
                  ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                  : 'border-zinc-700 hover:border-amber-500/50 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="relative w-full aspect-square bg-zinc-900 overflow-hidden">
                <img src={c.avatar} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-1.5 pt-4 pb-1">
                  <div className="text-white font-display font-black text-xs sm:text-sm leading-none truncate">{c.name}</div>
                  <div className="text-amber-400 text-[8px] sm:text-[9px] font-sub font-bold uppercase tracking-wide truncate">{c.moniker}</div>
                </div>
                {active && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center">
                    <Play size={9} className="ml-0.5" />
                  </div>
                )}
              </div>
              <div className="px-1.5 py-1 text-[8px] sm:text-[9px] font-sub text-slate-400 leading-tight h-8 overflow-hidden bg-zinc-950">
                {c.blurb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// Opponent seat picker — compact avatar chips for the 4 non-player characters. The chip the
// OTHER seat is using is disabled to keep the three seats distinct.
function OpponentSelect({ seat, label, value, candidates, disabledId, onChange }) {
  return (
    <div data-testid={`opp-select-${seat.toLowerCase()}`}>
      <div className="text-[11px] font-sub font-black uppercase tracking-[0.22em] text-amber-500/90 mb-2">{label}</div>
      <div className="grid grid-cols-4 gap-2">
        {candidates.map((id) => {
          const c = CHARACTERS[id];
          const active = value === id;
          const disabled = disabledId === id && !active;
          return (
            <button
              key={id}
              data-testid={`opp-${seat.toLowerCase()}-${id}`}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={`relative rounded-lg overflow-hidden border-2 text-center transition-all active:scale-95 ${
                active
                  ? 'border-amber-400 ring-1 ring-amber-400/60'
                  : disabled
                  ? 'border-zinc-800 opacity-30 cursor-not-allowed'
                  : 'border-zinc-700 hover:border-amber-500/50 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="relative w-full aspect-square bg-zinc-900 overflow-hidden">
                <img src={c.avatar} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="px-0.5 py-1 text-[9px] font-sub font-bold text-slate-200 truncate bg-zinc-950">{c.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConfigScreen({ state, act, onReplayTutorial, onOpenDedication }) {
  const s = state.settings;
  const set = (patch) => act({ type: 'UPDATE_SETTINGS', settings: patch });
  const roster = buildSeatChars(s.playerChar || 'g2', s.oppW, s.oppE);
  const oppCandidates = ROSTER_IDS.filter((id) => id !== (s.playerChar || 'g2'));
  return (
    <Overlay testid="config-screen">
      <div className="rounded-3xl overflow-hidden w-full max-w-lg pop-in max-h-[92vh] overflow-y-auto border-2 border-amber-600/50 bg-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.9),0_28px_70px_rgba(0,0,0,0.75)]">
        <div className="relative aspect-video bg-neutral-950">
          <img
            src="/assets/images/title_splash.jpg"
            alt="Bus' a Lead — Cutthroat Pinochle"
            data-testid="splash-hero"
            className="w-full h-full object-contain"
          />
          <a
            data-testid="feedback-link-menu"
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-3 z-10 text-xs font-sub font-bold text-amber-300/90 hover:text-amber-200 underline underline-offset-2 decoration-amber-400/50 hover:decoration-amber-300 transition-colors"
          >
            Feedback
          </a>
        </div>
        <div className="px-6 sm:px-8 pb-7 pt-5">
          <div className="space-y-4">
            <HustlerSelect value={s.playerChar || 'g2'} onChange={(id) => set({ playerChar: id })} />
            <OpponentSelect seat="W" label="Left Opponent" value={roster.W} candidates={oppCandidates} disabledId={roster.E} onChange={(id) => set({ oppW: id })} />
            <OpponentSelect seat="E" label="Right Opponent" value={roster.E} candidates={oppCandidates} disabledId={roster.W} onChange={(id) => set({ oppE: id })} />
            <Choice
              label="Difficulty"
              testidPrefix="cfg-difficulty"
              value={s.difficulty || 'normal'}
              onChange={(v) => set({ difficulty: v, tutorialHints: v === 'easy' })}
              options={CFG_DIFFICULTY}
            />
            <div data-testid="skillz-section" className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
              <Choice
                label="Skillz — Defensive AI"
                testidPrefix="cfg-skill"
                value={s.skill || 'alight'}
                onChange={(v) => set({ skill: v })}
                options={CFG_SKILL}
              />
              <div data-testid="skillz-blurb" className="text-[10px] font-sub text-rose-100/80 leading-snug">
                {SKILL_BLURB[s.skill || 'alight']}
              </div>
            </div>
            {s.difficulty === 'hard' && (
              <div data-testid="convict-tuning-dial" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
                <div className="text-[11px] font-sub uppercase tracking-widest text-amber-400/90 font-bold">
                  Convict Tuning
                </div>
                <Choice
                  label="Bid Boldness"
                  testidPrefix="cfg-convict-boldness"
                  value={s.convictBoldness || 'balanced'}
                  onChange={(v) => set({ convictBoldness: v })}
                  options={CFG_BOLDNESS}
                />
                <Choice
                  label="Renege Rate"
                  testidPrefix="cfg-convict-renege"
                  value={s.convictRenege || 'low'}
                  onChange={(v) => set({ convictRenege: v })}
                  options={CFG_RENEGE}
                />
              </div>
            )}
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
              label="Cutscene Audio"
              testidPrefix="cfg-taunt-audio"
              value={s.muteTaunts ? 'off' : 'on'}
              onChange={(v) => set({ muteTaunts: v === 'off' })}
              options={CFG_TAUNTS}
            />
            <Choice
              label="Tutorial Hints"
              testidPrefix="cfg-tutorial"
              value={s.tutorialHints ? 'on' : 'off'}
              onChange={(v) => set({ tutorialHints: v === 'on' })}
              options={CFG_TUTORIAL}
            />
            <Choice
              label="Table Stakes"
              testidPrefix="cfg-stakes"
              value={s.stakesBase || 1}
              onChange={(v) => set({ stakesBase: v })}
              options={CFG_STAKES}
            />
            <div data-testid="starting-bankroll-label" className="text-[11px] font-sub text-emerald-200/90 flex items-center gap-1.5 -mt-1">
              <Coins size={12} className="text-yellow-400 shrink-0" /> Starting Bankroll: <b className="text-emerald-300">$140.00</b> (CDCR Max Monthly Canteen Draw)
            </div>
          </div>
          <button
            data-testid="replay-tutorial-btn"
            onClick={onReplayTutorial}
            className="mt-4 w-full py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/60 text-cyan-100 font-display font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-cyan-500/25 transition-all active:scale-95"
          >
            <RotateCcw size={16} /> Replay Tutorial
          </button>
          <button
            data-testid="dedication-btn-title"
            onClick={onOpenDedication}
            className="mt-2 w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/50 text-amber-200 font-display font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all active:scale-95"
          >
            <Heart size={16} /> Yard Dedication
          </button>
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

export function SettlementModal({ state, act, onReplay, canReplay }) {
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
              {renegeTaunt(r.busted) && (
                <div
                  data-testid="convict-taunt"
                  className="mt-3 inline-block px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/50 text-amber-200 text-sm italic font-sub"
                >
                  {renegeTaunt(r.busted)}
                </div>
              )}
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

        {canReplay && (
          <button
            data-testid="replay-cutscene-btn"
            onClick={onReplay}
            className="w-full mb-2 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/60 text-amber-100 font-display font-bold flex items-center justify-center gap-2 hover:bg-amber-500/25 active:scale-95"
          >
            <Film size={16} /> Replay Cutscene
          </button>
        )}
        {r.gameOver ? (
          <>
            <button
              data-testid="new-game-btn"
              onClick={() => act({ type: 'NEW_GAME' })}
              className="w-full py-3 rounded-xl bg-yellow-500/20 border border-yellow-400 text-yellow-100 font-display font-bold flex items-center justify-center gap-2 hover:bg-yellow-500/30 active:scale-95"
            >
              <RotateCcw size={18} /> GAME OVER · NEW GAME
            </button>
            <a
              data-testid="feedback-btn-gameover"
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/70 text-emerald-100 font-display font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/25 active:scale-95 transition-all"
            >
              Give Feedback (2 Min) 📝
            </a>
          </>
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
  'Each player is dealt 25 cards; 5 go to the Kitty. Everyone starts with $140 — the CDCR Maximum Monthly Canteen Draw.',
  'Bidding opens left of the dealer in $5 steps. If both opponents pass, the bid drops on the dealer at base.',
  'The winning bidder must expose a Marriage (K+Q) to name trump before touching the kitty. No marriage = Soft Set.',
  'Bidder takes the 5-card kitty (30 cards) then buries exactly 5 before card 1.',
  'Defenders score no meld but MUST declare Aces Around before their first card or Bust a Lead.',
  'Follow suit and head the book if able; if void, trump and overtrump if able; else you may only slough off-suit.',
  'Counters: every Ace, 10 and King captured = 1 book (48 total). Winner of book 25 gets +2 (50 max).',
  'Books to Save = Max(20, Bid − Meld) — 31 floor if Going Double. Fewer books = Hard Set.',
  'Busting a lead (out of turn / renege / undeclared aces) = immediate Hard Set on the offender.',
  'Settlement (scaled by table stakes): Made +1/defender · Soft Set −1/defender · Hard Set −2/defender.',
  'Multipliers compound: Going Double ×2 · Lay-Down Challenged ×2 · Spades Trump ×2 (Double + Lay-Down in Spades = ×8).',
  'Throw It In: the bidder may surrender a hand mid-play from the top bar — it settles as a full Hard Set (−2 per defender × multipliers).',
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

export function RulebookModal({ onClose, onOpenDedication }) {
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
        <div className="flex gap-2 mb-4 flex-wrap">
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
          {onOpenDedication && (
            <button
              data-testid="dedication-btn-rules"
              onClick={onOpenDedication}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border bg-amber-500/10 border-amber-500/50 text-amber-200 hover:bg-amber-500/20 flex items-center gap-1"
            >
              <Heart size={12} /> Yard Dedication
            </button>
          )}
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
        <p className="text-sm text-slate-300 mb-5">Choose how you want to restart. Both options reset all bankrolls to <b className="text-emerald-300">$140.00</b>.</p>
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

// "Throw It In" — 2-button confirmation before the bidder surrenders the hand as a Hard Set.
export function ThrowInConfirmModal({ onCancel, onConfirm }) {
  return (
    <Overlay testid="throw-in-modal">
      <div className={`${GTA_PANEL} p-6 sm:p-7 w-full max-w-sm pop-in text-center border-rose-500/60`}>
        <Flag size={36} className="mx-auto text-rose-400 mb-3" />
        <div className="font-display font-black text-xl text-rose-300 uppercase tracking-wide mb-2">Throw It In?</div>
        <p className="text-sm text-slate-300 mb-5">
          Surrender hand and concede <b className="text-rose-300">Hard Set</b> (−2× per defender, scaled by table stakes &amp; multipliers).
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            data-testid="throw-in-cancel-btn"
            onClick={onCancel}
            className="py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-slate-200 font-display font-bold uppercase tracking-wide hover:bg-zinc-700 active:scale-95"
          >
            Cancel
          </button>
          <button
            data-testid="throw-in-confirm-btn"
            onClick={onConfirm}
            className="py-3 rounded-xl bg-rose-600 border-2 border-rose-300/50 text-white font-display font-black uppercase tracking-wide hover:bg-rose-500 active:scale-95 shadow-[0_4px_0_rgba(0,0,0,0.6)]"
          >
            Surrender Hand
          </button>
        </div>
      </div>
    </Overlay>
  );
}

const DEDICATION_BODY = [
  "'Bus' a Lead' isn't a studio concept or a generic card game. It is a living recreation of the games we played across concrete picnic tables inside California prisons—played for coffee, soup, and survival.",
  'Every character at this table—G2, Baby Boy, Scrap—is a real man. We spent decades inside study-tanks reframing constraints into tools. Today, we are home. We are free, thriving with our families, and building software that matters.',
  'To our brothers who lived the rules, kept their heads high, and made it across the line: this game is dedicated to you.',
  'Thank you for pulling up to the table.',
];

// Post-match Dedication & Origin tribute (also reachable from the Title Screen + Rulebook).
export function DedicationModal({ onPlayAgain, onClose }) {
  return (
    <div data-testid="dedication-modal" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-amber-500/70 bg-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.9),0_30px_80px_rgba(0,0,0,0.85)] pop-in">
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] chain-link" />
        <button
          data-testid="dedication-close-btn"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-zinc-900 border border-amber-500/30 text-amber-200 hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className="relative px-6 sm:px-8 pt-7 pb-6">
          <div className="text-[10px] font-sub font-black uppercase tracking-[0.3em] text-amber-500/90 mb-2">BUS' A LEAD: DEDICATION &amp; ORIGIN</div>
          <h2 data-testid="dedication-headline" className="font-display font-black text-base md:text-lg text-white leading-snug uppercase tracking-wide mb-5">
            We played these hands when freedom felt like a myth.
          </h2>
          <div className="space-y-3.5">
            {DEDICATION_BODY.map((p) => (
              <p key={p.slice(0, 24)} className="text-sm text-slate-300 leading-relaxed font-sub">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-6 pl-4 border-l-2 border-amber-500/70 text-sm text-amber-100 font-sub">
            <div className="font-display font-bold">— Ron Scott (G2)</div>
            <div className="text-slate-400 text-xs mt-0.5">Founder, Get2 Studios | get2.one</div>
          </div>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              data-testid="dedication-play-again-btn"
              onClick={onPlayAgain}
              className="py-3 rounded-xl bg-amber-500 border-2 border-black/70 text-black font-display font-black uppercase tracking-wide hover:bg-amber-400 active:scale-95 flex items-center justify-center gap-2 shadow-[0_5px_0_rgba(0,0,0,0.6)]"
            >
              <Play size={16} /> Play Again
            </button>
            <a
              data-testid="dedication-get2-link"
              href={GET2_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Get2 Studios"
              title="Visit Get2 Studios"
              className="group py-2 px-4 rounded-xl bg-zinc-900 border border-amber-500/50 hover:bg-zinc-800 hover:border-amber-400 hover:shadow-[0_0_22px_rgba(251,191,36,0.45)] active:scale-95 flex items-center justify-center transition-[background-color,border-color,box-shadow,transform] duration-200"
            >
              <img src="/assets/get2-logo.png" alt="Get2 Studios" className="h-9 w-auto object-contain transition-[filter,transform] duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


export function YardCourtModal({ state, onAccuse, onClose }) {
  const s = state;
  const log = s.playLog || [];
  const books = [...new Set(log.map((e) => e.book))].sort((a, b) => a - b);
  // Auto-flag: books that contain an illegal opponent play.
  const flaggedBooks = new Set(log.filter((e) => e.seat !== 'P' && !e.legal).map((e) => e.book));
  const firstFlagged = books.find((b) => flaggedBooks.has(b));
  const [sel, setSel] = useState(firstFlagged || (books.length ? books[books.length - 1] : 1));
  const entries = log.filter((e) => e.book === sel).sort((a, b) => a.playIndex - b.playIndex);
  const lead = entries[0];
  const opps = entries.filter((e) => e.seat !== 'P');

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
      data-testid="yard-court-modal"
    >
      <div className={`${GTA_PANEL} w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pop-in`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-300 font-display font-black tracking-wide">
            <Gavel size={18} /> YARD COURT — RENEGE AUDIT
          </div>
          <button data-testid="yard-court-close-btn" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {books.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">No books have been played yet.</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-white/5 overflow-x-auto">
              <div className="flex gap-2">
                {books.map((b) => (
                  <button
                    key={b}
                    data-testid={`audit-book-${b}`}
                    onClick={() => setSel(b)}
                    className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-sub font-bold border transition-colors ${
                      sel === b
                        ? 'bg-amber-500 text-black border-amber-400'
                        : flaggedBooks.has(b)
                        ? 'bg-rose-950/70 text-rose-200 border-rose-500/70'
                        : 'bg-zinc-800/70 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    Book {b}
                    {flaggedBooks.has(b) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-black animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {lead && (
                <div className="mb-4 flex items-center gap-2 text-xs font-sub text-zinc-400">
                  <span>
                    Lead: <span className="text-amber-300 font-bold">{SEAT_LABEL[lead.leadSeat]}</span> played
                  </span>
                  <Card card={lead.leadCard} size="sm" />
                </div>
              )}

              <div className="space-y-4">
                {opps.map((e) => (
                  <div
                    key={e.seat}
                    data-testid={`audit-play-${e.seat}-${sel}`}
                    className={`rounded-xl border p-4 ${
                      !e.legal ? 'border-rose-500/70 bg-rose-950/30' : 'border-zinc-700/70 bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-zinc-100">{SEAT_LABEL[e.seat]}</span>
                        <span className="text-xs text-zinc-500 font-sub">played</span>
                        <div className={!e.legal ? 'renege-ring rounded-md' : ''}>
                          <Card card={e.card} size="sm" />
                        </div>
                      </div>
                      <button
                        data-testid={`accuse-${e.seat}-btn`}
                        onClick={() => onAccuse(e.seat, sel)}
                        className={`px-3 py-2 rounded-lg text-white text-xs font-display font-black tracking-wide flex items-center gap-1.5 active:scale-95 shrink-0 ${
                          !e.legal ? 'bg-rose-600 hover:bg-rose-500 animate-pulse' : 'bg-rose-700/80 hover:bg-rose-600'
                        }`}
                      >
                        <ShieldAlert size={14} /> ACCUSE
                      </button>
                    </div>
                    {!e.legal && (
                      <div
                        data-testid={`audit-flag-${e.seat}-${sel}`}
                        className="mb-3 flex items-center gap-1.5 text-[11px] font-sub font-bold text-rose-300 uppercase tracking-wide"
                      >
                        <ShieldAlert size={13} /> Flagged: {e.reason}
                      </div>
                    )}
                    <div className="text-[10px] font-sub uppercase tracking-widest text-zinc-500 mb-1.5">
                      Hand held at that moment
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.handBefore.map((c) => (
                        <Card key={c.id} card={c} size="xs" />
                      ))}
                    </div>
                  </div>
                ))}
                {opps.length === 0 && (
                  <div className="text-center text-zinc-500 text-sm py-6">
                    No opponent plays recorded for this book yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <div className="px-5 py-3 border-t border-white/5 text-[11px] text-zinc-500 font-sub flex items-center gap-1.5">
          <ShieldAlert size={13} className="text-rose-400" /> A valid call Hard-Sets the cheater. A false accusation Hard-Sets you.
        </div>
      </div>
    </div>
  );
}

export function MeldPhaseModal({ reveal, onClose }) {
  const [remaining, setRemaining] = useState(100);
  useEffect(() => {
    const dismiss = setTimeout(onClose, 3500);
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 100 / 35)), 100);
    return () => {
      clearTimeout(dismiss);
      clearInterval(tick);
    };
  }, [onClose]);

  const items = reveal?.items || [];
  const total = reveal?.total || 0;
  const name = SEAT_LABEL[reveal?.bidder] || 'Bidder';

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
      data-testid="meld-phase-modal"
      onClick={onClose}
    >
      <div className={`${GTA_PANEL} w-full max-w-md pop-in overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-amber-500/30 flex items-center gap-2 text-amber-300 font-display font-black tracking-wide">
          <Layers size={18} /> {name.toUpperCase()} — DECLARED MELD
        </div>
        <div className="p-5 max-h-[55vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-zinc-400 text-sm py-6">No meld declared — playing off the strength of the hand.</div>
          ) : (
            <ul className="space-y-3">
              {items.map((it, i) => (
                <li
                  key={`${it.name}-${i}`}
                  data-testid={`meld-phase-item-${i}`}
                  className="border-b border-white/5 pb-3"
                >
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-zinc-200 font-sub">{it.name}</span>
                    <span className="font-mono-stat text-emerald-300 font-bold">+{it.pts}</span>
                  </div>
                  {it.cards?.length > 0 && (
                    <div data-testid={`meld-phase-cards-${i}`} className="flex flex-wrap gap-1">
                      {it.cards.map((c) => (
                        <Card key={c.id} card={c} size="xs" />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/40 px-4 py-3">
            <span className="font-display font-black text-amber-200 uppercase tracking-wide">Total Meld</span>
            <span data-testid="meld-phase-total" className="font-mono-stat text-2xl font-black text-yellow-300">{total}</span>
          </div>
        </div>
        <button
          data-testid="meld-phase-continue-btn"
          onClick={onClose}
          className="w-full py-3 bg-amber-500 text-black font-display font-black uppercase tracking-wide hover:bg-amber-400 active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Play size={16} /> Continue to Book 1
        </button>
        <div className="h-1 bg-amber-500/70" style={{ width: `${remaining}%`, transition: 'width 0.1s linear' }} />
      </div>
    </div>
  );
}


// Full-screen player for a single reel — plays with audio + native controls; Skip
// returns to the gallery grid, Close (X) shuts the whole modal. When `slideshow` is
// provided it auto-advances to the next clip on end and shows prev/next + a counter.
function ReelPlayer({ clip, onBack, onClose, slideshow }) {
  const inShow = !!slideshow;
  const handleEnded = () => (inShow ? slideshow.onNext() : onBack());
  return (
    <div
      data-testid={inShow ? 'reel-slideshow' : `reel-player-${clip.base}`}
      className="fixed inset-0 z-[135] flex items-center justify-center bg-black animate-[fadeIn_0.2s_ease]"
      onClick={onBack}
    >
      <video
        key={clip.base}
        autoPlay
        playsInline
        controls
        preload="auto"
        onEnded={handleEnded}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full max-w-[100vw] max-h-[100vh] object-contain"
      >
        {videoSources(clip.base).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-black/70 border border-amber-500/50 text-amber-300 text-sm font-display font-black tracking-wide backdrop-blur pointer-events-none flex items-center gap-2">
        {inShow && (
          <span data-testid="reel-slideshow-counter" className="text-amber-500/80 text-xs">
            {slideshow.index + 1} / {slideshow.total}
          </span>
        )}
        {clip.title}
      </div>

      {inShow && (
        <>
          <button
            data-testid="reel-prev-btn"
            onClick={(e) => {
              e.stopPropagation();
              slideshow.onPrev();
            }}
            disabled={slideshow.index === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white backdrop-blur transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            data-testid="reel-next-btn"
            onClick={(e) => {
              e.stopPropagation();
              slideshow.onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white backdrop-blur transition-colors active:scale-95"
          >
            <ChevronRight size={22} />
          </button>
          <button
            data-testid="reel-grid-btn"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="absolute bottom-6 left-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-display font-bold flex items-center gap-2 backdrop-blur transition-colors active:scale-95"
          >
            <LayoutGrid size={16} /> Grid
          </button>
        </>
      )}

      <button
        data-testid="reel-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (inShow) slideshow.onNext();
          else onBack();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-display font-bold flex items-center gap-2 backdrop-blur transition-colors active:scale-95"
      >
        {inShow ? 'Next' : 'Skip'} <SkipForward size={16} />
      </button>
      <button
        data-testid="reel-close-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white backdrop-blur transition-colors active:scale-95"
      >
        <X size={18} />
      </button>
    </div>
  );
}

// "Yard Reels" — interactive cinematics gallery. Thumbnails seek to a frame (#t=0.5);
// tapping one opens the full-screen ReelPlayer. "Play All" starts an auto-advancing
// slideshow through every clip in the library.
export function CinematicsModal({ onClose }) {
  const [selected, setSelected] = useState(null);
  const [showIdx, setShowIdx] = useState(null); // slideshow index, or null when inactive

  const startSlideshow = () => {
    setSelected(null);
    setShowIdx(0);
  };
  // Auto-advance; exit back to the grid after the final clip.
  const nextSlide = useCallback(
    () => setShowIdx((i) => (i + 1 >= CUTSCENE_LIBRARY.length ? null : i + 1)),
    []
  );
  const prevSlide = useCallback(() => setShowIdx((i) => Math.max(0, i - 1)), []);
  // Stable prop so ReelPlayer doesn't get a fresh object every render.
  const slideshow = useMemo(
    () =>
      showIdx == null
        ? null
        : { index: showIdx, total: CUTSCENE_LIBRARY.length, onNext: nextSlide, onPrev: prevSlide },
    [showIdx, nextSlide, prevSlide]
  );

  return (
    <div data-testid="cinematics-modal" className="fixed inset-0 z-[90] flex">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative m-auto w-full max-w-5xl max-h-[88vh] ${GTA_PANEL} p-5 flex flex-col`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Film size={20} />
            <div className="font-display font-black text-xl uppercase tracking-wide">Yard Reels</div>
            <span className="text-slate-500 text-xs font-sub">{CUTSCENE_LIBRARY.length} clips</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="play-all-btn"
              onClick={startSlideshow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-display font-black uppercase tracking-wide transition-colors active:scale-95"
            >
              <PlayCircle size={16} /> Play All
            </button>
            <button
              data-testid="close-cinematics-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 border border-amber-500/30 text-amber-200 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div
          className="overflow-y-auto pr-1"
          style={{
            maxHeight: '85vh',
            WebkitOverflowScrolling: 'touch',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {CUTSCENE_LIBRARY.map((c) => (
            <button
              key={c.base}
              data-testid={`reel-thumb-${c.base}`}
              onClick={() => setSelected(c)}
              className="group relative rounded-xl overflow-hidden border border-amber-500/20 bg-black/50 hover:border-amber-400/70 transition-all active:scale-95 text-left"
            >
              <div className="relative w-full aspect-video bg-slate-900 overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                <video muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100">
                  <source src={`/assets/cutscenes/${c.base}.webm#t=0.5`} type="video/webm" />
                  <source src={`/assets/cutscenes/${c.base}.mp4#t=0.5`} type="video/mp4" />
                </video>
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-amber-500/90 text-black flex items-center justify-center shadow-lg">
                    <Play size={16} className="ml-0.5" />
                  </div>
                </div>
                <span
                  className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${
                    c.tag === 'Taunt'
                      ? 'bg-fuchsia-500/80 text-white'
                      : c.tag === 'Ambient'
                      ? 'bg-slate-600/80 text-white'
                      : 'bg-amber-500/90 text-black'
                  }`}
                >
                  {c.tag}
                </span>
              </div>
              <div className="px-2 py-1.5 text-[11px] font-sub font-bold text-slate-200 truncate">{c.title}</div>
            </button>
          ))}
        </div>
      </div>
      {selected && <ReelPlayer clip={selected} onBack={() => setSelected(null)} onClose={onClose} />}
      {showIdx != null && (
        <ReelPlayer
          clip={CUTSCENE_LIBRARY[showIdx]}
          onBack={() => setShowIdx(null)}
          onClose={onClose}
          slideshow={slideshow}
        />
      )}
    </div>
  );
}
