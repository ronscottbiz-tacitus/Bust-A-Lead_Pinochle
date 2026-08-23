import { Card } from './Card';
import { SEAT_LABEL, SUIT_BY_KEY, SEATS } from '../game/constants';
import { legalPlays } from '../game/trick';
import { sortHand } from '../game/deck';
import { Volume2, VolumeX, BookOpen, Coins, Layers } from 'lucide-react';

const money = (n) => `$${n.toFixed(2)}`;

function liveMultiplier(s) {
  let m = 1;
  if (s.goingDouble) m *= 2;
  if (s.laydownChallenged) m *= 2;
  if (s.trump === 'S') m *= 2;
  return m;
}

function TrumpBadge({ trump }) {
  if (!trump)
    return (
      <span
        data-testid="trump-badge"
        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800/70 text-slate-400 border border-slate-700"
      >
        NO TRUMP
      </span>
    );
  const su = SUIT_BY_KEY[trump];
  const spades = trump === 'S';
  return (
    <span
      data-testid="trump-badge"
      className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
        spades
          ? 'bg-yellow-500/10 border-yellow-400 text-yellow-300 gold-pulse'
          : 'bg-cyan-500/10 border-cyan-400/60 text-cyan-200'
      }`}
    >
      <span style={{ color: spades ? '#facc15' : su.neon }} className="text-sm">
        {su.symbol}
      </span>
      {su.name}
    </span>
  );
}

export function Header({ state, onToggleSound, onOpenRules }) {
  const s = state;
  const mult = liveMultiplier(s);
  const bidderBooks = s.phase === 'play' || s.phase === 'settlement' ? s.books[s.bidWinner] + s.buriedBooks : 0;
  const bench = s.goingDouble ? 31 : 20;
  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 glass px-3 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="font-display font-black text-sm sm:text-lg tracking-tight text-cyan-300 leading-none">
          BUST<span className="text-fuchsia-400">·</span>A<span className="text-fuchsia-400">·</span>LEAD
        </div>
        <div className="hidden sm:flex items-center gap-3 font-mono-stat text-xs">
          {SEATS.map((k) => (
            <div
              key={k}
              data-testid={`bankroll-${k}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border ${
                s.dealer === k ? 'border-yellow-400/70 bg-yellow-500/5' : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              <Coins size={12} className="text-yellow-400" />
              <span className="text-slate-300">{SEAT_LABEL[k]}</span>
              <span className="text-emerald-300 font-bold">{money(s.bankrolls[k])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <span
          data-testid="dealer-badge"
          className="hidden md:inline px-2 py-1 rounded-full text-[11px] font-bold bg-slate-800/70 border border-slate-700 text-slate-300"
        >
          Dealer: {SEAT_LABEL[s.dealer]}
        </span>
        <TrumpBadge trump={s.trump} />
        {(s.phase === 'play' || s.phase === 'settlement') && (
          <>
            <span
              data-testid="trick-counter"
              className="px-2 py-1 rounded-md text-[11px] font-mono-stat font-bold bg-slate-800/70 border border-slate-700 text-slate-200"
            >
              Trick {Math.min(s.trickNo, 25)}/25
            </span>
            <span
              data-testid="book-tracker"
              className="px-2 py-1 rounded-md text-[11px] font-mono-stat font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300"
              title="Bidder books / save benchmark"
            >
              Books {bidderBooks}/{bench}
            </span>
          </>
        )}
        <span
          data-testid="stakes-badge"
          className={`px-2 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
            mult > 1 ? 'bg-fuchsia-500/10 border-fuchsia-400/60 text-fuchsia-300' : 'bg-slate-800/70 border-slate-700 text-slate-400'
          }`}
        >
          <Layers size={12} /> ×{mult}
        </span>
        <button
          data-testid="rules-btn"
          onClick={onOpenRules}
          className="p-2 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
        >
          <BookOpen size={16} />
        </button>
        <button
          data-testid="sound-toggle"
          onClick={onToggleSound}
          className="p-2 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
        >
          {s.settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
    </header>
  );
}

function statusText(s, seat) {
  if (s.phase === 'auction') {
    if (s.passed[seat]) return 'PASS';
    if (s.highBidder === seat) return `Bid $${s.bid}`;
    if (s.currentBidder === seat) return 'Thinking…';
    return 'Waiting';
  }
  if (s.bidWinner === seat && (s.phase === 'discard' || s.phase === 'laydown')) return 'Bidder';
  if (s.defenderAces[seat] === 'single') return 'Aces! (10)';
  if (s.defenderAces[seat] === 'double') return '1000 Aces!';
  return null;
}

function Seat({ state, seat, corner }) {
  const s = state;
  const isTurn =
    (s.phase === 'auction' && s.currentBidder === seat) ||
    (s.phase === 'play' && s.turn === seat && !s.trickPending);
  const status = statusText(s, seat);
  const count = s.hands[seat].length;
  const expose = seat === s.bidWinner && s.bidderExposed;
  return (
    <div
      data-testid={`seat-${seat}`}
      className={`absolute ${corner} flex flex-col items-center gap-1 z-20`}
    >
      <div
        className={`flex items-center gap-2 glass rounded-xl px-3 py-1.5 ${
          isTurn ? 'ring-2 ring-cyan-400 neon-cyan' : ''
        } ${s.bidWinner === seat ? 'border-yellow-400/50' : ''}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-xs ${
            seat === 'W' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-cyan-500/20 text-cyan-300'
          }`}
        >
          {SEAT_LABEL[seat][0]}
        </div>
        <div className="leading-tight">
          <div className="text-xs font-sub font-semibold text-slate-200">{SEAT_LABEL[seat]}</div>
          <div className="text-[10px] font-mono-stat text-emerald-300">{money(s.bankrolls[seat])}</div>
        </div>
        {status && (
          <span
            data-testid={`seat-status-${seat}`}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              status === 'PASS'
                ? 'bg-slate-700 text-slate-400'
                : 'bg-cyan-500/20 text-cyan-200'
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <div className="flex" style={{ marginLeft: 6 }}>
        {(expose ? s.hands[seat] : Array.from({ length: Math.min(count, 12) })).map((c, i) => (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : -22 }}>
            <Card size="sm" faceDown={!expose} card={expose ? c : null} />
          </div>
        ))}
        <span className="ml-1 self-center text-[10px] font-mono-stat text-slate-400">{count}</span>
      </div>
    </div>
  );
}

function TrickCard({ play }) {
  const posMap = {
    W: 'top-2 left-2',
    E: 'top-2 right-2',
    P: 'bottom-2 left-1/2 -translate-x-1/2',
  };
  return (
    <div className={`absolute ${posMap[play.seat]} pop-in`}>
      <Card card={play.card} size="md" />
      <div className="text-center text-[9px] font-mono-stat text-slate-400 mt-0.5">{SEAT_LABEL[play.seat]}</div>
    </div>
  );
}

function CenterArea({ state }) {
  const s = state;
  const showKitty = ['dealing', 'auction', 'trump', 'discard', 'laydown'].includes(s.phase);
  return (
    <div className="relative w-[240px] h-[190px] sm:w-[300px] sm:h-[210px] rounded-[40%] border border-white/5 bg-white/[0.02] flex items-center justify-center">
      {showKitty && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] font-sub uppercase tracking-widest text-slate-500">
            {s.kittyCollected ? 'Kitty Collected' : 'The Kitty'}
          </div>
          <div className="flex">
            {s.kitty.map((c, i) => (
              <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -30 }} className="deal-in" data-anim-delay={i}>
                <Card
                  card={c}
                  size="md"
                  faceDown={!(s.kittyExposed || (s.bidWinner === 'P' && s.kittyCollected))}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {s.phase === 'play' && s.trick.map((p) => <TrickCard key={p.card.id} play={p} />)}
      {s.phase === 'play' && s.trick.length === 0 && s.lastTrickWinner && (
        <div className="text-center text-[11px] font-sub text-slate-500">
          <div className="uppercase tracking-widest text-[9px]">Last trick</div>
          <div className="text-cyan-300 font-bold">{SEAT_LABEL[s.lastTrickWinner]} won</div>
        </div>
      )}
    </div>
  );
}

export function HandTray({ state, onCardClick }) {
  const s = state;
  const hand = sortHand(s.hands.P, s.settings.sortMode, s.trump);
  const canPlay = s.phase === 'play' && s.turn === 'P' && !s.trickPending && !s.humanAcesPending;
  const legalIds = canPlay ? new Set(legalPlays(hand, s.trick, s.trump).map((c) => c.id)) : null;
  const selecting = s.phase === 'discard' && s.bidWinner === 'P';
  const n = hand.length;

  return (
    <div
      data-testid="player-hand"
      className="fixed bottom-1 inset-x-0 z-30 flex items-end justify-center px-2 overflow-x-auto py-3"
    >
      <div className="flex items-end justify-center min-w-min">
        {hand.map((c, i) => {
          const mid = (n - 1) / 2;
          const rot = (i - mid) * 2.2;
          const lift = Math.abs(i - mid) * 3;
          const legal = legalIds ? legalIds.has(c.id) : false;
          const dim = canPlay && !legal;
          const selected = selecting && s.discards.includes(c.id);
          const interactive = selecting || legal;
          return (
            <div
              key={c.id}
              style={{
                marginLeft: i === 0 ? 0 : -18,
                transform: `rotate(${rot}deg) translateY(${lift}px)`,
                transformOrigin: 'bottom center',
                zIndex: i,
              }}
            >
              <Card
                card={c}
                size="lg"
                legal={legal}
                dim={dim}
                selected={selected}
                onClick={interactive ? () => onCardClick(c) : undefined}
                testid={`card-${c.suit}-${c.rank}-${i}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Table({ state }) {
  return (
    <div className="absolute inset-0 top-16 bottom-28 flex flex-col items-center justify-center">
      <Seat state={state} seat="W" corner="top-2 left-2 sm:top-4 sm:left-6" />
      <Seat state={state} seat="E" corner="top-2 right-2 sm:top-4 sm:right-6" />
      <CenterArea state={state} />
    </div>
  );
}
