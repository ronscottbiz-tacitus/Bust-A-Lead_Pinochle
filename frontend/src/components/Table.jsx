import { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { SEAT_LABEL, SUIT_BY_KEY, SEATS, SUIT_KEYS, SEAT_AVATAR } from '../game/constants';
import { legalPlays } from '../game/trick';
import { sortHand } from '../game/deck';
import { computeMeld } from '../game/meld';
import { saveTarget, booksToMake } from '../game/scoring';
import { Volume2, VolumeX, BookOpen, Coins, Layers, BarChart3, History, RefreshCw, Sparkles, AlertTriangle, ChevronDown, MoreVertical } from 'lucide-react';

const money = (n) => `$${n.toFixed(2)}`;
const STAKE_LABEL = { 1: '$1/$2', 2: '$2/$4', 5: '$5/$10' };

function useViewport() {
  const [vp, setVp] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
    desktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    mobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  }));
  useEffect(() => {
    const onResize = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight, desktop: window.innerWidth >= 1024, mobile: window.innerWidth < 768 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vp;
}

function useTableReactions(state) {
  const [reactions, setReactions] = useState({});
  const prevLen = useRef(state.completedBooks?.length || 0);
  const prevPhase = useRef(state.phase);

  useEffect(() => {
    const len = state.completedBooks?.length || 0;
    if (state.phase === 'play' && len > prevLen.current) {
      const last = state.completedBooks[len - 1];
      const key = `book-${len}`;
      const text = last.pts > 0 ? `+${last.pts}` : 'Book!';
      setReactions((r) => ({ ...r, [last.winner]: { text, tone: 'good', key } }));
      const t = setTimeout(() => {
        setReactions((r) => (r[last.winner]?.key === key ? { ...r, [last.winner]: null } : r));
      }, 1600);
      prevLen.current = len;
      return () => clearTimeout(t);
    }
    prevLen.current = len;
  }, [state.completedBooks, state.phase]);

  useEffect(() => {
    if (state.phase === 'settlement' && prevPhase.current !== 'settlement' && state.settlement) {
      const net = { W: 0, E: 0, P: 0 };
      state.settlement.transfers.forEach((t) => {
        net[t.to] += t.amount;
        net[t.from] -= t.amount;
      });
      const key = `settle-${Date.now()}`;
      const map = {};
      SEATS.forEach((seat) => {
        const v = net[seat];
        map[seat] = {
          text: v > 0 ? `+${money(v)}` : v < 0 ? `-${money(-v)}` : 'Even',
          tone: v >= 0 ? 'good' : 'bad',
          key,
        };
      });
      setReactions(map);
      const t = setTimeout(() => setReactions({}), 2600);
      prevPhase.current = state.phase;
      return () => clearTimeout(t);
    }
    prevPhase.current = state.phase;
  }, [state.phase, state.settlement]);

  return reactions;
}

function useBidderSpotlight(state) {
  const [spot, setSpot] = useState(null);
  const prev = useRef(state.bidWinner);
  useEffect(() => {
    if (state.bidWinner && !prev.current) {
      const key = Date.now();
      setSpot({ seat: state.bidWinner, bid: state.bid, key });
      const t = setTimeout(() => setSpot((v) => (v && v.key === key ? null : v)), 2800);
      prev.current = state.bidWinner;
      return () => clearTimeout(t);
    }
    prev.current = state.bidWinner;
  }, [state.bidWinner, state.bid]);
  return spot;
}

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

export function Header({ state, onToggleSound, onOpenRules, onOpenStats, onNewGame, onOpenMeld }) {
  const s = state;
  const { mobile } = useViewport();
  const [menu, setMenu] = useState(false);
  const mult = liveMultiplier(s);
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const showMeldPill = ['discard', 'laydown', 'play', 'settlement'].includes(s.phase) && s.bidWinner;
  // During discard the committed meld isn't stored yet — compute the live total so the pill matches the drawer.
  const pillTotal =
    s.phase === 'discard' && s.bidWinner === 'P'
      ? computeMeld(s.hands.P.filter((c) => !s.discards.includes(c.id)), s.trump).total
      : meldTotal;
  const bidderBooks = s.phase === 'play' || s.phase === 'settlement' ? s.books[s.bidWinner] + s.buriedBooks : 0;
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const stakes = s.settings.stakesBase || 1;
  const su = s.trump ? SUIT_BY_KEY[s.trump] : null;
  const pot = stakes * mult;

  if (mobile) {
    return (
      <header className="fixed top-0 inset-x-0 z-50 h-12 flex items-center justify-between px-3 glass border-b border-white/10">
        <a
          href="https://get2.one"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="get2-logo-link"
          className="flex items-center hover:opacity-85 shrink-0"
        >
          <img src="/assets/get2-logo_bal_blk.png" alt="Get2" className="h-7 w-auto object-contain" />
        </a>
        <div
          data-testid="mobile-status-pill"
          className="flex items-center gap-1.5 text-[11px] font-mono-stat text-slate-200 bg-slate-900/70 rounded-full px-2.5 py-1 border border-slate-700"
        >
          <span className="text-emerald-300">Pot: ${pot}</span>
          <span className="text-slate-600">•</span>
          <span style={{ color: su ? su.neon : '#64748b' }} className="text-sm font-black leading-none">
            {su ? su.symbol : '—'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {showMeldPill && (
            <button
              data-testid="meld-pill"
              onClick={onOpenMeld}
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-400/60 text-amber-200"
            >
              {pillTotal}p
            </button>
          )}
          <button data-testid="rules-btn" onClick={onOpenRules} className="p-1.5 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300">
            <BookOpen size={15} />
          </button>
          <button data-testid="stats-btn" onClick={onOpenStats} className="p-1.5 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300">
            <BarChart3 size={15} />
          </button>
          <div className="relative">
            <button data-testid="menu-btn" onClick={() => setMenu((m) => !m)} className="p-1.5 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300">
              <MoreVertical size={15} />
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-50 w-40 glass rounded-xl border border-white/10 p-1.5 flex flex-col gap-1">
                <button
                  data-testid="sound-toggle"
                  onClick={onToggleSound}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/5"
                >
                  {s.settings.sound ? <Volume2 size={14} /> : <VolumeX size={14} />} Sound: {s.settings.sound ? 'On' : 'Off'}
                </button>
                <button
                  data-testid="new-game-header-btn"
                  onClick={() => {
                    setMenu(false);
                    onNewGame();
                  }}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-fuchsia-200 hover:bg-fuchsia-500/10"
                >
                  <RefreshCw size={14} /> New Game
                </button>
              </div>
            )}
          </div>
        </div>
        {(s.phase === 'play' || s.phase === 'settlement') && (
          <div className="absolute top-12 inset-x-0 flex justify-center pointer-events-none">
            <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono-stat bg-slate-900/80 border border-slate-700 text-slate-200">
              Book {Math.min(s.trickNo, 25)}/25 · Bidder {bidderBooks}/{bench}
            </div>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 glass px-3 sm:px-6 flex items-center gap-3">
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="https://get2.one"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="get2-logo-link"
          className="flex items-center hover:opacity-85 transition-opacity shrink-0"
        >
          <img src="/assets/get2-logo_bal_blk.png" alt="Get2" className="h-9 w-auto object-contain" />
        </a>
        <div className="font-display font-black text-base lg:text-lg tracking-tight text-cyan-300 leading-none whitespace-nowrap">
          BUS'<span className="text-fuchsia-400">·</span>A<span className="text-fuchsia-400">·</span>LEAD
        </div>
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <div
          data-testid="status-capsule"
          className="flex items-center gap-2 font-mono-stat text-[11px] lg:text-xs bg-slate-900/60 border border-slate-700 rounded-full px-3 py-1.5 max-w-full overflow-hidden whitespace-nowrap"
        >
          <span className="text-emerald-300">Pot: ${pot}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">
            Trump:{' '}
            <span style={{ color: su ? su.neon : '#64748b' }} className="text-sm font-black leading-none">
              {su ? su.symbol : '—'}
            </span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">
            Stake: {STAKE_LABEL[stakes] || `$${stakes}`}
            {mult > 1 ? ` ×${mult}` : ''}
          </span>
          {(s.phase === 'play' || s.phase === 'settlement') && (
            <>
              <span className="text-slate-600 hidden lg:inline">•</span>
              <span data-testid="trick-counter" className="hidden lg:inline text-slate-200">
                Book {Math.min(s.trickNo, 25)}/25
              </span>
              <span className="text-slate-600 hidden lg:inline">•</span>
              <span data-testid="book-tracker" className="hidden lg:inline text-emerald-300">
                Books {bidderBooks}/{bench}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {showMeldPill && (
          <button
            data-testid="meld-pill"
            onClick={onOpenMeld}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-400/60 text-amber-200 hover:bg-amber-500/25 transition-colors flex items-center gap-1"
          >
            <Layers size={12} /> {SEAT_LABEL[s.bidWinner]} Meld: {pillTotal} pts <ChevronDown size={12} />
          </button>
        )}
        <button
          data-testid="stats-btn"
          onClick={onOpenStats}
          className="p-2 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
        >
          <BarChart3 size={16} />
        </button>
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
        <button
          data-testid="new-game-header-btn"
          onClick={onNewGame}
          className="px-2.5 py-2 rounded-md bg-fuchsia-500/15 border border-fuchsia-400/50 text-fuchsia-200 hover:bg-fuchsia-500/25 transition-colors flex items-center gap-1 text-[11px] font-bold"
        >
          <RefreshCw size={14} /> <span className="hidden lg:inline">New Game</span>
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

function ReactionBadge({ reaction, testid, className = '' }) {
  if (!reaction || !reaction.text) return null;
  return (
    <div
      key={reaction.key}
      data-testid={testid}
      className={`react-pop absolute z-30 px-2.5 py-0.5 rounded-full text-xs font-display font-black whitespace-nowrap border shadow-[0_0_16px_rgba(52,211,153,0.75)] ${
        reaction.tone === 'bad'
          ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.7)]'
          : 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
      } ${className}`}
    >
      {reaction.text}
    </div>
  );
}

function Seat({ state, seat, corner, reaction }) {
  const s = state;
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const isTurn =
    (s.phase === 'auction' && s.currentBidder === seat) ||
    (s.phase === 'play' && s.turn === seat && !s.trickPending);
  const isBidder = s.bidWinner === seat;
  const status = statusText(s, seat);
  const count = s.hands[seat].length;
  const expose = seat === s.bidWinner && s.bidderExposed;
  const showBooks = s.phase === 'play' || s.phase === 'settlement';
  const lastAction = [...(s.bidLog || [])].reverse().find((e) => e.seat === seat);
  const bubbleText =
    s.phase === 'auction'
      ? s.currentBidder === seat && !s.passed[seat]
        ? 'Thinking…'
        : lastAction
        ? lastAction.text
        : null
      : null;
  const aces = s.defenderAces[seat];
  return (
    <div
      data-testid={`seat-${seat}`}
      className={`absolute ${corner} flex flex-col items-center gap-1 z-20`}
    >
      {bubbleText && (
        <div
          data-testid={`bubble-${seat}`}
          className={`pop-in mb-0.5 px-2.5 py-1 rounded-2xl text-[11px] font-sub font-bold border shadow-lg ${
            bubbleText === 'Pass'
              ? 'bg-slate-800 border-slate-600 text-slate-300'
              : bubbleText === 'Thinking…'
              ? 'bg-slate-800/80 border-cyan-500/40 text-cyan-200'
              : 'bg-yellow-500/20 border-yellow-400/70 text-yellow-200'
          }`}
        >
          {SEAT_LABEL[seat]}: {bubbleText}
        </div>
      )}
      <div
        className={`relative flex flex-col items-center gap-1.5 glass rounded-2xl px-3 py-2.5 transition-all duration-200 ${
          isTurn ? 'ring-4 ring-cyan-400 neon-cyan scale-105' : isBidder ? 'ring-2 ring-yellow-400/70' : ''
        }`}
      >
        <ReactionBadge reaction={reaction} testid={`reaction-${seat}`} className="-top-3 left-1/2 -translate-x-1/2" />
        <div
          className={`relative w-14 h-14 md:w-16 md:h-16 lg:w-24 lg:h-24 rounded-2xl overflow-hidden border-[3px] bg-slate-900 flex items-center justify-center font-display font-black text-2xl ${
            isTurn
              ? 'border-cyan-300'
              : isBidder
              ? 'border-yellow-400/80'
              : seat === 'W'
              ? 'border-fuchsia-500/60 text-fuchsia-300'
              : 'border-cyan-500/50 text-cyan-300'
          }`}
        >
          {SEAT_AVATAR[seat] ? (
            <>
              <span className="absolute inset-0 flex items-center justify-center text-slate-500 select-none pointer-events-none">
                {SEAT_LABEL[seat][0]}
              </span>
              <img
                src={SEAT_AVATAR[seat]}
                alt={SEAT_LABEL[seat]}
                className="relative w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </>
          ) : (
            SEAT_LABEL[seat][0]
          )}
          {isTurn && (
            <div className="absolute inset-0 rounded-2xl ring-4 ring-inset ring-cyan-400/50 animate-pulse pointer-events-none" />
          )}
          {isBidder && (
            <div className="absolute top-0.5 right-0.5 bg-yellow-400 text-black text-[8px] font-black px-1 rounded-full shadow">
              BID
            </div>
          )}
        </div>
        <div className="flex flex-col items-center leading-tight">
          <div
            className={`font-display font-black text-sm tracking-tight ${
              seat === 'W' ? 'text-fuchsia-300' : 'text-cyan-300'
            }`}
          >
            {SEAT_LABEL[seat]}
          </div>
          <div
            data-testid={`seat-bankroll-${seat}`}
            className="mt-0.5 flex items-center gap-1 font-mono-stat text-[11px] font-bold text-emerald-300 bg-slate-900/70 rounded-full px-2 py-0.5 border border-slate-700"
          >
            <Coins size={10} className="text-yellow-400" /> {money(s.bankrolls[seat])}
          </div>
          {seat === s.dealer && (
            <div
              data-testid={`dealer-chip-${seat}`}
              className="mt-0.5 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/60 text-yellow-200"
            >
              Dealer
            </div>
          )}
          {showBooks && (
            <div data-testid={`seat-books-${seat}`} className="mt-0.5 text-[10px] font-mono-stat text-cyan-300">
              Books: {s.books[seat]}
              {seat === s.bidWinner ? ` / ${bench}` : ''}
            </div>
          )}
        </div>
        {status && (
          <span
            data-testid={`seat-status-${seat}`}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              status === 'PASS' ? 'bg-slate-700 text-slate-400' : 'bg-cyan-500/20 text-cyan-200'
            }`}
          >
            {status}
          </span>
        )}
      </div>
      {(aces === 'single' || aces === 'double') && (
        <div
          data-testid={`aces-badge-${seat}`}
          className="pop-in px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 border border-yellow-400 text-yellow-200 flex items-center gap-1 shadow-[0_0_12px_rgba(255,199,0,0.6)]"
        >
          <Sparkles size={10} /> {aces === 'double' ? '1000 Aces!' : 'Aces Declared'}
        </div>
      )}
      {seat === s.bidWinner && s.bidderAcesDeclared && (
        <div
          data-testid={`bidder-aces-badge-${seat}`}
          className="pop-in px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 border border-amber-400 text-amber-100 flex items-center gap-1 shadow-[0_0_12px_rgba(255,199,0,0.6)]"
        >
          <Sparkles size={10} /> Aces Declared
        </div>
      )}
      <div data-testid={`facedown-fan-${seat}`} className="flex" style={{ marginLeft: 6 }}>
        {(expose ? s.hands[seat] : Array.from({ length: Math.min(count, 12) })).map((c, i) => (
          <div key={c?.id || `fd-${i}`} style={{ marginLeft: i === 0 ? 0 : -16 }}>
            <Card size={expose ? 'sm' : 'xs'} faceDown={!expose} card={expose ? c : null} />
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
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const su = s.trump ? SUIT_BY_KEY[s.trump] : null;
  return (
    <div className="relative w-[240px] h-[190px] sm:w-[300px] sm:h-[210px] rounded-[40%] border border-white/5 bg-white/[0.02] flex items-center justify-center">
      {(s.phase === 'auction' || showKitty) && (
        <div className="flex flex-col items-center gap-2">
          {s.phase === 'auction' && (
            <div data-testid="auction-log" className="flex flex-col items-center gap-1">
              <div className="text-[10px] font-sub uppercase tracking-widest text-cyan-300/70">Auction</div>
              <div className="glass rounded-lg px-3 py-1.5 text-center">
                <div className="text-[11px] font-mono-stat text-slate-300">
                  High Bid: <b className="text-yellow-300">{s.bid == null ? '—' : `$${s.bid}`}</b>
                </div>
                <div className="text-[10px] font-sub text-slate-400">
                  {s.highBidder ? `${SEAT_LABEL[s.highBidder]} leading` : 'No bids yet'}
                </div>
              </div>
            </div>
          )}
          {showKitty && (
            <div data-testid="kitty-pile" className="flex flex-col items-center gap-1">
              <div className="text-[10px] font-sub uppercase tracking-[0.28em] text-amber-400/80 font-bold">
                {s.kittyCollected ? 'KITTY COLLECTED' : 'THE KITTY'}
              </div>
              <div className="flex">
                {s.kitty.map((c, i) => (
                  <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -30 }} className="deal-in">
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
        </div>
      )}
      {(s.phase === 'play' || s.phase === 'settlement') && su && (
        <div
          data-testid="contract-badge"
          className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${
            s.trick.length ? 'opacity-30' : 'opacity-95'
          } transition-opacity`}
        >
          <div
            className={`text-5xl leading-none ${s.trump === 'S' ? 'gold-pulse rounded-full px-2' : ''}`}
            style={{ color: s.trump === 'S' ? '#facc15' : su.neon }}
          >
            {su.symbol}
          </div>
          <div className="text-[11px] font-mono-stat text-slate-200 mt-1">Contract: {s.bid}</div>
          <div className="text-[11px] font-mono-stat text-emerald-300">
            Books to Save: {bench} / Target: 50
          </div>
        </div>
      )}
      {s.phase === 'play' && s.trick.map((p) => <TrickCard key={p.card.id} play={p} />)}
      {s.phase === 'play' && s.trick.length === 0 && s.lastTrickWinner && (
        <div className="absolute bottom-1 text-center text-[11px] font-sub text-slate-500">
          <div className="uppercase tracking-widest text-[9px]">Last book</div>
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
  const hard = s.settings.difficulty === 'hard';
  const legalIds = canPlay && !hard ? new Set(legalPlays(hand, s.trick, s.trump).map((c) => c.id)) : null;
  const selecting = s.phase === 'discard' && s.bidWinner === 'P';
  const n = hand.length;
  const idx = new Map(hand.map((c, i) => [c.id, i]));
  const { w: winW, h: winH, desktop: isDesktop, mobile: isMobile } = useViewport();
  // Zero-scroll dynamic overlap: fit all cards inside the available width.
  // Desktop uses larger cards; tablet/landscape uses medium cards for the same clean fan.
  const fanSize = isDesktop ? 'lg' : 'md';
  const cardW = isDesktop ? 80 : 56;
  const avail = Math.min(winW - 32, 1500);
  const needed = n > 1 ? (n * cardW - avail) / (n - 1) : 0;
  const overlap = -Math.min(Math.max(needed, 16), cardW - 20);

  const groups = { S: [], H: [], D: [], C: [] };
  hand.forEach((c) => groups[c.suit].push(c));

  const renderCard = (c, size = 'lg') => {
    const i = idx.get(c.id);
    const legal = legalIds ? legalIds.has(c.id) : false;
    const dim = canPlay && !hard && !legal;
    const selected = selecting && s.discards.includes(c.id);
    const interactive = selecting || (canPlay && (hard || legal));
    return (
      <Card
        card={c}
        size={size}
        legal={legal}
        dim={dim}
        selected={selected}
        onClick={interactive ? () => onCardClick(c) : undefined}
        testid={`card-${c.suit}-${c.rank}-${i}`}
      />
    );
  };

  // Mobile (<768px): 4-column vertical suit matrix pinned to the bottom, zero-scroll.
  if (isMobile) {
    const mdH = 74;
    const availColH = Math.max(150, winH * 0.42 - 44);
    const vStep = (m) => (m > 1 ? -Math.min(Math.max((m * mdH - availColH) / (m - 1), 26), mdH - 12) : 0);
    return (
      <div
        data-testid="player-hand"
        className="fixed inset-x-0 bottom-0 z-30 h-[42%] px-1 pb-[env(safe-area-inset-bottom)] pointer-events-auto overflow-hidden"
      >
        <div className="grid grid-cols-4 gap-1 h-full">
          {SUIT_KEYS.map((k) => {
            const col = groups[k];
            const step = vStep(col.length);
            const su = SUIT_BY_KEY[k];
            return (
              <div key={k} data-testid={`suit-col-${k}`} className="flex flex-col items-center overflow-hidden">
                <div
                  className={`text-sm font-black leading-none mb-0.5 ${k === s.trump ? 'gold-pulse rounded px-1' : ''}`}
                  style={{ color: k === s.trump ? '#facc15' : su.neon }}
                >
                  {su.symbol}
                </div>
                <div className="flex flex-col items-center">
                  {col.map((c, gi) => (
                    <div key={c.id} style={{ marginTop: gi === 0 ? 0 : step, zIndex: gi }}>
                      {renderCard(c, 'md')}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Tablet / landscape / desktop (>=768px): one clean zero-scroll dynamic fan.
  return (
    <div data-testid="player-hand" className="fixed bottom-3 inset-x-0 z-30 px-2 pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <div className="flex items-end justify-center overflow-visible pb-6 pointer-events-auto">
        <div className="flex items-end justify-center">
          {hand.map((c) => {
            const i = idx.get(c.id);
            const mid = (n - 1) / 2;
            const rot = (i - mid) * 1.6;
            const lift = Math.abs(i - mid) * 2.0;
            return (
              <div
                key={c.id}
                className="hover:-translate-y-8 hover:scale-110 hover:z-40 transition-all duration-150"
                style={{
                  marginLeft: i === 0 ? 0 : overlap,
                  transform: `rotate(${rot}deg) translateY(${lift}px)`,
                  transformOrigin: 'bottom center',
                  zIndex: i,
                }}
              >
                {renderCard(c, fanSize)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SaveHUD({ state }) {
  const s = state;
  if (!['play', 'settlement'].includes(s.phase) || !s.bidWinner) return null;
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const needed = booksToMake({ bid: s.bid, meldTotal });
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const won = s.books[s.bidWinner] + s.buriedBooks;
  const pct = Math.min(100, Math.round((won / Math.max(bench, 1)) * 100));
  return (
    <div
      data-testid="save-hud"
      className="fixed top-[68px] left-1/2 -translate-x-1/2 z-30 glass rounded-xl px-3 py-2 flex flex-col items-center gap-1.5 w-[min(94vw,540px)]"
    >
      <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono-stat flex-wrap justify-center">
        <span className="text-slate-300">
          Bid <b className="text-yellow-300">{s.bid}</b>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">
          Meld <b className="text-cyan-300">{meldTotal}</b>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">
          Books to Make <b className="text-emerald-300">{needed}</b>
        </span>
        <span className="text-slate-600">|</span>
        <span
          data-testid="books-to-save"
          className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-200 font-bold"
        >
          Books to Save: {bench}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div data-testid="bidder-books-won" className="text-[10px] font-mono-stat text-slate-400">
        {SEAT_LABEL[s.bidWinner]} Books Won: {won} / {bench}
      </div>
    </div>
  );
}

export function DiscardHUD({ state }) {
  const s = state;
  if (s.phase !== 'discard' || s.bidWinner !== 'P') return null;
  const discardSet = new Set(s.discards);
  const kept = s.hands.P.filter((c) => !discardSet.has(c.id));
  const activeMeld = computeMeld(kept, s.trump).total;
  const diff = (s.bid || 0) - activeMeld;
  const booksNeeded = Math.max(0, diff);
  const floor = s.goingDouble ? 31 : 20;
  const booksToSave = Math.max(floor, diff);
  const safetyFloor = diff <= floor;
  const boardWarn = diff > 50;
  return (
    <div
      data-testid="discard-hud"
      className="fixed top-[68px] left-1/2 -translate-x-1/2 z-30 glass rounded-xl px-4 py-2.5 flex flex-col items-center gap-2 w-[min(94vw,560px)]"
    >
      <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono-stat flex-wrap justify-center">
        <span className="text-slate-300">
          Bid <b className="text-yellow-300">{s.bid}</b>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">
          Active Meld <b data-testid="discard-active-meld" className="text-cyan-300">{activeMeld}</b>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">
          Books Needed <b data-testid="discard-books-needed" className="text-emerald-300">{booksNeeded}</b>
        </span>
        <span className="text-slate-600">|</span>
        <span
          data-testid="discard-books-to-save"
          className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-200 font-bold"
        >
          Books to Save: {booksToSave}
        </span>
      </div>
      {boardWarn ? (
        <div
          data-testid="board-set-warning"
          className="red-flash w-full text-center px-3 py-1.5 rounded-lg border text-xs font-display font-black text-rose-100 flex items-center justify-center gap-1.5"
        >
          <AlertTriangle size={14} /> BOARD SET WARNING (&gt;50 Books Required)
        </div>
      ) : safetyFloor ? (
        <div
          data-testid="safety-floor-badge"
          className="w-full text-center px-3 py-1 rounded-lg border border-emerald-400/70 bg-emerald-500/15 text-xs font-bold text-emerald-200"
        >
          Max Safety Floor ({floor} Books to Save) — surplus meld can be buried safely
        </div>
      ) : null}
    </div>
  );
}

export function DealAnimation({ state }) {
  const s = state;
  if (s.phase !== 'dealing') return null;
  const targets = {
    W: { x: '-38vw', y: '-28vh' },
    E: { x: '38vw', y: '-28vh' },
    P: { x: '0px', y: '34vh' },
    K: { x: '0px', y: '0px' },
  };
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center" data-testid="deal-animation">
      <div className="text-[10px] font-sub uppercase tracking-widest text-cyan-300/70 absolute top-24">Dealing…</div>
      {s.packets.map((p, i) => {
        const t = targets[p.seat] || targets.K;
        return (
          <div
            key={`${p.seat}-${i}`}
            className="absolute deal-fly"
            style={{ '--tx': t.x, '--ty': t.y, animationDelay: `${i * 0.09}s` }}
          >
            <Card size="sm" faceDown />
          </div>
        );
      })}
    </div>
  );
}

export function Table({ state, onOpenHistory }) {
  const s = state;
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const showBooks = s.phase === 'play' || s.phase === 'settlement';
  const reactions = useTableReactions(state);
  const spotlight = useBidderSpotlight(state);
  const pTurn = s.phase === 'play' && s.turn === 'P' && !s.trickPending;
  const pBidder = s.bidWinner === 'P';
  const { mobile: isMobile } = useViewport();
  return (
    <div className="absolute inset-0 top-16 bottom-28 flex flex-col items-center justify-center">
      <img
        src="/assets/get2-logo_bal_blk.png"
        alt=""
        data-testid="table-watermark"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15 mix-blend-luminosity pointer-events-none w-96 max-w-full z-0"
      />
      <Seat state={state} seat="W" corner="top-2 left-2 sm:top-4 sm:left-6" reaction={reactions.W} />
      <Seat state={state} seat="E" corner="top-2 right-2 sm:top-4 sm:right-6" reaction={reactions.E} />
      <CenterArea state={state} />
      <SaveHUD state={state} />
      <DiscardHUD state={state} />
      {spotlight && (
        <div data-testid="bidder-spotlight" className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="spotlight-in relative flex flex-col items-center">
            <div
              className="absolute -inset-24 gold-rays pointer-events-none opacity-70"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, rgba(255,199,0,0.16) 12deg, transparent 24deg, transparent 36deg, rgba(255,199,0,0.16) 48deg, transparent 60deg, transparent 72deg, rgba(255,199,0,0.16) 84deg, transparent 96deg)',
              }}
            />
            <div className="relative px-8 py-5 rounded-2xl border-4 border-amber-400 bg-black/85 shadow-[0_0_60px_rgba(255,199,0,0.65)] text-center">
              <div className="gta-title text-2xl sm:text-4xl leading-none">
                {spotlight.seat === 'P'
                  ? 'YOU TOOK THE CONTRACT'
                  : `${SEAT_LABEL[spotlight.seat].toUpperCase()} TOOK THE CONTRACT`}
              </div>
              <div className="font-display font-black text-amber-300 text-lg sm:text-2xl mt-1">
                AT {spotlight.bid}
              </div>
            </div>
          </div>
        </div>
      )}
      {s.phase !== 'config' && !isMobile && (
        <div className="absolute bottom-2 left-2 sm:left-6 flex items-center gap-2 z-40">
          <div
            className={`relative glass rounded-2xl pl-2 pr-3 py-2 flex items-center gap-2.5 transition-all duration-200 ${
              pTurn ? 'ring-4 ring-cyan-400 neon-cyan' : pBidder ? 'ring-2 ring-yellow-400/70' : ''
            }`}
          >
            <ReactionBadge reaction={reactions.P} testid="reaction-P" className="-top-3 left-6" />
            <div
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-[3px] bg-slate-900 flex items-center justify-center font-display font-black text-xl ${
                pTurn ? 'border-cyan-300' : pBidder ? 'border-yellow-400/80' : 'border-cyan-400/50'
              }`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-slate-500 select-none pointer-events-none">G2</span>
              <img
                src={SEAT_AVATAR.P}
                alt="G2"
                data-testid="player-avatar"
                className="relative w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {pTurn && (
                <div className="absolute inset-0 rounded-xl ring-4 ring-inset ring-cyan-400/50 animate-pulse pointer-events-none" />
              )}
              {pBidder && (
                <div className="absolute top-0.5 right-0.5 bg-yellow-400 text-black text-[8px] font-black px-1 rounded-full shadow">
                  BID
                </div>
              )}
            </div>
            <div data-testid="seat-books-P" className="text-[11px] font-mono-stat text-cyan-300 leading-tight">
              <div className="text-slate-100 font-display font-black text-sm">G2</div>
              <div className="flex items-center gap-1 text-emerald-300">
                <Coins size={10} className="text-yellow-400" />
                {money(s.bankrolls.P)}
              </div>
              {showBooks && (
                <div>
                  Books: {s.books.P}
                  {pBidder ? ` / ${bench}` : ''}
                </div>
              )}
              {s.dealer === 'P' && (
                <div
                  data-testid="dealer-chip-P"
                  className="mt-0.5 inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/60 text-yellow-200"
                >
                  Dealer
                </div>
              )}
            </div>
          </div>
          {(s.defenderAces.P === 'single' || s.defenderAces.P === 'double') && (
            <div
              data-testid="aces-badge-P"
              className="glass rounded-lg px-2 py-1.5 text-[10px] font-bold text-yellow-200 border border-yellow-400/70 flex items-center gap-1 shadow-[0_0_12px_rgba(255,199,0,0.6)]"
            >
              <Sparkles size={11} /> {s.defenderAces.P === 'double' ? '1000 Aces!' : 'Aces Declared'}
            </div>
          )}
          {s.completedBooks.length > 0 && (
            <button
              data-testid="book-history-btn"
              onClick={onOpenHistory}
              className="glass rounded-lg px-2.5 py-1.5 text-[11px] font-sub text-slate-300 hover:text-cyan-300 flex items-center gap-1 border border-slate-700 hover:border-cyan-500/50"
            >
              <History size={13} /> Book History
            </button>
          )}
        </div>
      )}
      {s.phase !== 'config' && isMobile && (
        <div
          data-testid="mobile-g2-bar"
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5"
        >
          <div
            className={`relative glass rounded-full pl-1 pr-2.5 py-1 flex items-center gap-1.5 transition-all duration-200 ${
              pTurn ? 'ring-2 ring-cyan-400 neon-cyan' : pBidder ? 'ring-2 ring-yellow-400/70' : ''
            }`}
          >
            <ReactionBadge reaction={reactions.P} testid="reaction-P" className="-top-3 left-4" />
            <div
              className={`relative w-7 h-7 rounded-full overflow-hidden border-2 bg-slate-900 flex items-center justify-center font-display font-black text-[10px] ${
                pTurn ? 'border-cyan-300' : pBidder ? 'border-yellow-400/80' : 'border-cyan-400/50'
              }`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-slate-500 select-none pointer-events-none">G2</span>
              <img
                src={SEAT_AVATAR.P}
                alt="G2"
                data-testid="player-avatar"
                className="relative w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <span className="text-[11px] font-display font-black text-slate-100">G2</span>
            <span data-testid="seat-books-P" className="text-[11px] font-mono-stat text-emerald-300 flex items-center gap-0.5">
              <Coins size={9} className="text-yellow-400" />
              {money(s.bankrolls.P)}
            </span>
            {showBooks && (
              <span className="text-[10px] font-mono-stat text-cyan-300 whitespace-nowrap">
                Bk {s.books.P}
                {pBidder ? `/${bench}` : ''}
              </span>
            )}
            {pBidder && (
              <span className="bg-yellow-400 text-black text-[8px] font-black px-1 rounded-full">BID</span>
            )}
            {(s.defenderAces.P === 'single' || s.defenderAces.P === 'double') && (
              <span data-testid="aces-badge-P" className="text-yellow-200 flex items-center" title={s.defenderAces.P === 'double' ? '1000 Aces!' : 'Aces Declared'}>
                <Sparkles size={12} />
              </span>
            )}
            {s.dealer === 'P' && (
              <span
                data-testid="dealer-chip-P"
                className="text-[8px] font-black uppercase tracking-wide px-1 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/60 text-yellow-200"
              >
                D
              </span>
            )}
          </div>
          {s.completedBooks.length > 0 && (
            <button
              data-testid="book-history-btn"
              onClick={onOpenHistory}
              className="glass rounded-full p-1.5 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50"
              aria-label="Book History"
            >
              <History size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
