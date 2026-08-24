import { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { SEAT_LABEL, SUIT_BY_KEY, SEATS, SUIT_KEYS, SEAT_AVATAR } from '../game/constants';
import { legalPlays } from '../game/trick';
import { sortHand } from '../game/deck';
import { saveTarget, booksToMake } from '../game/scoring';
import { Volume2, VolumeX, BookOpen, Coins, Layers, BarChart3, History, RefreshCw, Sparkles } from 'lucide-react';

const money = (n) => `$${n.toFixed(2)}`;
const STAKE_LABEL = { 1: '$1/$2', 2: '$2/$4', 5: '$5/$10' };

function useViewport() {
  const [vp, setVp] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    desktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  }));
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, desktop: window.innerWidth >= 1024 });
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

export function Header({ state, onToggleSound, onOpenRules, onOpenStats, onNewGame }) {
  const s = state;
  const mult = liveMultiplier(s);
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const bidderBooks = s.phase === 'play' || s.phase === 'settlement' ? s.books[s.bidWinner] + s.buriedBooks : 0;
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const stakes = s.settings.stakesBase || 1;
  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 glass px-3 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="font-display font-black text-sm sm:text-lg tracking-tight text-cyan-300 leading-none">
          BUS'<span className="text-fuchsia-400">·</span>A<span className="text-fuchsia-400">·</span>LEAD
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
              Book {Math.min(s.trickNo, 25)}/25
            </span>
            <span
              data-testid="book-tracker"
              className="px-2 py-1 rounded-md text-[11px] font-mono-stat font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300"
              title="Bidder books won / books to save"
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
          <Layers size={12} /> {STAKE_LABEL[stakes] || `$${stakes}`} ×{mult}
        </span>
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
          <RefreshCw size={14} /> <span className="hidden sm:inline">New Game</span>
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
          className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden border-[3px] bg-slate-900 flex items-center justify-center font-display font-black text-2xl ${
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
            <img src={SEAT_AVATAR[seat]} alt={SEAT_LABEL[seat]} className="w-full h-full object-cover" />
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
  const showKitty = ['auction', 'trump', 'discard', 'laydown'].includes(s.phase);
  const meldTotal = s.meld[s.bidWinner]?.total || 0;
  const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
  const su = s.trump ? SUIT_BY_KEY[s.trump] : null;
  return (
    <div className="relative w-[240px] h-[190px] sm:w-[300px] sm:h-[210px] rounded-[40%] border border-white/5 bg-white/[0.02] flex items-center justify-center">
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
      {showKitty && s.phase !== 'auction' && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] font-sub uppercase tracking-widest text-slate-500">
            {s.kittyCollected ? 'Kitty Collected' : 'The Kitty'}
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
          <div className="text-[11px] font-mono-stat text-cyan-300">Meld: {meldTotal}</div>
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
  const legalIds = canPlay ? new Set(legalPlays(hand, s.trick, s.trump).map((c) => c.id)) : null;
  const selecting = s.phase === 'discard' && s.bidWinner === 'P';
  const n = hand.length;
  const idx = new Map(hand.map((c, i) => [c.id, i]));
  const { w: winW, desktop: isDesktop } = useViewport();
  // Zero-scroll dynamic overlap: fit all cards inside the available width.
  const cardW = 80;
  const avail = Math.min(winW - 32, 1500);
  const needed = n > 1 ? (n * cardW - avail) / (n - 1) : 0;
  const overlap = -Math.min(Math.max(needed, 18), cardW - 22);

  const groups = { S: [], H: [], D: [], C: [] };
  hand.forEach((c) => groups[c.suit].push(c));
  const [tab, setTab] = useState('ALL');
  const activeTab = tab === 'ALL' ? 'ALL' : groups[tab]?.length ? tab : 'ALL';
  const mobileCards = activeTab === 'ALL' ? hand : groups[activeTab];

  const renderCard = (c) => {
    const i = idx.get(c.id);
    const legal = legalIds ? legalIds.has(c.id) : false;
    const dim = canPlay && !legal;
    const selected = selecting && s.discards.includes(c.id);
    const interactive = selecting || legal;
    return (
      <Card
        card={c}
        size="lg"
        legal={legal}
        dim={dim}
        selected={selected}
        onClick={interactive ? () => onCardClick(c) : undefined}
        testid={`card-${c.suit}-${c.rank}-${i}`}
      />
    );
  };

  const TABS = [
    { key: 'ALL', label: 'All', count: n },
    ...SUIT_KEYS.map((k) => ({ key: k, label: SUIT_BY_KEY[k].symbol, count: groups[k].length, suit: k })),
  ];

  return (
    <div data-testid="player-hand" className="fixed bottom-3 inset-x-0 z-30 px-2 pb-[env(safe-area-inset-bottom)] pointer-events-none">
      {isDesktop ? (
        /* Desktop (>=1024px): zero-scroll dynamic fan */
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
                  {renderCard(c)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Tablet & Mobile (<1024px): suit-tab filter incl. an All two-row grid */
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          <div className="flex gap-1.5 glass rounded-xl px-2 py-1.5 flex-wrap justify-center max-w-[96vw]">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              const su = t.suit ? SUIT_BY_KEY[t.suit] : null;
              return (
                <button
                  key={t.key}
                  data-testid={`suit-tab-${t.key}`}
                  onClick={() => setTab(t.key)}
                  disabled={t.count === 0}
                  className={`relative px-3 py-1.5 rounded-lg border text-sm font-bold transition-all disabled:opacity-30 ${
                    active ? 'bg-cyan-500/20 border-cyan-400 neon-cyan' : 'bg-slate-800/60 border-slate-700'
                  } ${t.suit === s.trump ? 'ring-1 ring-yellow-400/70' : ''}`}
                >
                  {su ? (
                    <span style={{ color: su.neon }} className="text-lg">
                      {su.label}
                    </span>
                  ) : (
                    <span className="text-slate-200">All</span>
                  )}
                  <span
                    data-testid={`suit-count-${t.key}`}
                    className="absolute -top-1.5 -right-1.5 bg-slate-900 border border-slate-600 text-[9px] font-mono-stat text-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end justify-center gap-1 max-w-full max-h-[240px] overflow-y-auto pb-1">
            {mobileCards.map((c) => (
              <div key={c.id}>{renderCard(c)}</div>
            ))}
          </div>
        </div>
      )}
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

export function MeldRack({ state }) {
  const s = state;
  if (!s.bidWinner || !s.meld[s.bidWinner]) return null;
  if (!['play', 'laydown', 'settlement'].includes(s.phase)) return null;
  const cards = s.meld[s.bidWinner].allCards || [];
  if (!cards.length) return null;
  const played = new Set(s.playedIds || []);
  return (
    <div
      data-testid="meld-rack"
      className="fixed top-[142px] left-1/2 -translate-x-1/2 z-20 glass rounded-xl px-3 py-2 max-w-[94vw]"
    >
      <div className="text-[10px] font-sub uppercase tracking-widest text-yellow-300/80 mb-1 text-center">
        {SEAT_LABEL[s.bidWinner]}'s Meld Rack · {s.meld[s.bidWinner].total} pts
      </div>
      <div className="flex flex-wrap justify-center gap-1 max-w-[540px]">
        {cards.map((c) => {
          const isPlayed = played.has(c.id);
          return (
            <div
              key={c.id}
              className="relative"
              data-testid={`meld-card-${c.suit}-${c.rank}`}
              data-played={isPlayed ? 'true' : 'false'}
            >
              <Card card={c} size="sm" className={isPlayed ? 'opacity-30 grayscale' : ''} />
              {isPlayed && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[130%] h-[3px] bg-rose-500/90 -rotate-[24deg] rounded-full shadow" />
                </div>
              )}
            </div>
          );
        })}
      </div>
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
            key={i}
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
  const pTurn = s.phase === 'play' && s.turn === 'P' && !s.trickPending;
  const pBidder = s.bidWinner === 'P';
  return (
    <div className="absolute inset-0 top-16 bottom-28 flex flex-col items-center justify-center">
      <Seat state={state} seat="W" corner="top-2 left-2 sm:top-4 sm:left-6" reaction={reactions.W} />
      <Seat state={state} seat="E" corner="top-2 right-2 sm:top-4 sm:right-6" reaction={reactions.E} />
      <CenterArea state={state} />
      <SaveHUD state={state} />
      <MeldRack state={state} />
      {showBooks && (
        <div className="absolute bottom-2 left-2 sm:left-6 flex items-center gap-2 z-40">
          <div
            className={`relative glass rounded-2xl pl-2 pr-3 py-2 flex items-center gap-2.5 transition-all duration-200 ${
              pTurn ? 'ring-4 ring-cyan-400 neon-cyan' : pBidder ? 'ring-2 ring-yellow-400/70' : ''
            }`}
          >
            <ReactionBadge reaction={reactions.P} testid="reaction-P" className="-top-3 left-6" />
            <div
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-[3px] ${
                pTurn ? 'border-cyan-300' : pBidder ? 'border-yellow-400/80' : 'border-cyan-400/50'
              }`}
            >
              <img src={SEAT_AVATAR.P} alt="You" data-testid="player-avatar" className="w-full h-full object-cover" />
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
              <div className="text-slate-100 font-display font-black text-sm">You</div>
              <div className="flex items-center gap-1 text-emerald-300">
                <Coins size={10} className="text-yellow-400" />
                {money(s.bankrolls.P)}
              </div>
              <div>
                Books: {s.books.P}
                {pBidder ? ` / ${bench}` : ''}
              </div>
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
    </div>
  );
}
