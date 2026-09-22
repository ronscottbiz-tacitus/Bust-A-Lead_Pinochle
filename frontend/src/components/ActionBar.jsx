import { SUIT_BY_KEY, SEAT_LABEL } from '../game/constants';
import { acesAround, computeMeld } from '../game/meld';
import { saveTarget, potentialLosers, laydownRoom, LAYDOWN_MARGIN } from '../game/scoring';
import { Gavel, X, Check, Eye, EyeOff, Flag, Zap, LayoutGrid, Sparkles } from 'lucide-react';

const Btn = ({ children, onClick, disabled, tone = 'cyan', testid, className = '', title }) => {
  const tones = {
    cyan: 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/25',
    gold: 'bg-yellow-500/15 border-yellow-400/60 text-yellow-200 hover:bg-yellow-500/25',
    red: 'bg-rose-500/15 border-rose-400/60 text-rose-200 hover:bg-rose-500/25',
    fuchsia: 'bg-fuchsia-500/15 border-fuchsia-400/60 text-fuchsia-200 hover:bg-fuchsia-500/25',
    slate: 'bg-slate-700/40 border-slate-600 text-slate-300 hover:bg-slate-700/60',
  };
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-2 md:px-4 rounded-xl border font-sub font-semibold text-xs md:text-sm min-h-[40px] transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
};

// Mobile (<768px): every panel docks in the strip between the compact seats and the center
// felt so it never covers an avatar or the hand. Tablet/desktop keep their placements.
// Centering uses a full-width flex rail (not translate-x) because the float-up keyframe
// animation owns `transform` and would otherwise cancel the horizontal centering.
const MOBILE_DOCK = 'fixed inset-x-0 top-[136px]';
const WRAP_POS = {
  bottom: `${MOBILE_DOCK} md:top-auto md:bottom-48`,
  center: `${MOBILE_DOCK} md:top-[40%] md:-translate-y-1/2`,
  upper: `${MOBILE_DOCK} md:top-[15%]`,
  banner: `${MOBILE_DOCK} md:top-28`,
};

const Wrap = ({ children, hint, pos = 'bottom' }) => (
  <div className={`${WRAP_POS[pos]} action-rail z-40 flex justify-center pointer-events-none px-2`} data-testid="action-bar">
    <div className="float-up pointer-events-auto glass rounded-2xl px-3 py-2.5 md:px-4 md:py-3 flex flex-col items-center gap-2 neon-cyan max-w-full">
      {hint && <div className="text-[10px] md:text-[11px] font-sub uppercase tracking-widest text-cyan-300/80 text-center">{hint}</div>}
      <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
    </div>
  </div>
);

export function ActionBar({ state, act }) {
  const s = state;
  const isBidder = s.bidWinner === 'P';

  // AUCTION
  if (s.phase === 'auction' && s.currentBidder === 'P') {
    const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
    return (
      <Wrap pos="center" hint={`Auction · current high ${s.bid == null ? '—' : '$' + s.bid}`}>
        <Btn testid="bid-btn" tone="gold" onClick={() => act({ type: 'PLACE_BID', seat: 'P' })}>
          <Gavel size={16} /> Bid ${nextVal}
        </Btn>
        <Btn testid="pass-btn" tone="slate" onClick={() => act({ type: 'PASS', seat: 'P' })}>
          <X size={16} /> Pass
        </Btn>
      </Wrap>
    );
  }

  // TRUMP DECLARATION (human bidder)
  if (s.phase === 'trump' && isBidder) {
    if (s.availableTrumps.length === 0) {
      return (
        <Wrap pos="center" hint="No marriage in hand — Soft Set required">
          <Btn testid="soft-set-btn" tone="red" onClick={() => act({ type: 'SOFT_SET' })}>
            <Flag size={16} /> Concede (Soft Set)
          </Btn>
        </Wrap>
      );
    }
    return (
      <Wrap pos="center" hint="Declare Trump — expose a Marriage (K+Q)">
        {s.availableTrumps.map((suit) => {
          const su = SUIT_BY_KEY[suit];
          return (
            <Btn
              key={suit}
              testid={`trump-${suit}`}
              tone={suit === 'S' ? 'gold' : 'cyan'}
              onClick={() => act({ type: 'DECLARE_TRUMP', suit })}
            >
              <span style={{ color: su.neon }} className="text-base">
                {su.symbol}
              </span>{' '}
              {su.name}
            </Btn>
          );
        })}
      </Wrap>
    );
  }

  // DISCARD + PRE-PLAY DECLARATIONS (human bidder)
  if (s.phase === 'discard' && isBidder) {
    const count = s.discards.length;
    // Lay-Down viability on the live kept hand: potential losers vs room (50 − bench − margin).
    const discardSet = new Set(s.discards);
    const kept = s.hands.P.filter((c) => !discardSet.has(c.id));
    const bench = saveTarget({ bid: s.bid, meldTotal: computeMeld(kept, s.trump).total, goingDouble: s.goingDouble });
    const losers = potentialLosers(kept, s.trump);
    const room = laydownRoom(bench) - LAYDOWN_MARGIN;
    const canLaydown = losers <= room;
    return (
      <Wrap pos="upper" hint={`Bury exactly 5 cards · selected ${count}/5`}>
        <Btn testid="expose-kitty-btn" tone="slate" onClick={() => act({ type: 'TOGGLE_EXPOSE' })}>
          {s.kittyExposed ? <EyeOff size={16} /> : <Eye size={16} />}
          {s.kittyExposed ? 'Hide Kitty' : 'Expose Kitty'}
        </Btn>
        <Btn
          testid="going-double-btn"
          tone={s.goingDouble ? 'fuchsia' : 'slate'}
          onClick={() => act({ type: 'TOGGLE_GOING_DOUBLE' })}
        >
          <Zap size={16} /> Going Double {s.goingDouble ? '✓' : ''}
        </Btn>
        <Btn
          testid="laydown-btn"
          tone={s.laydown && canLaydown ? 'fuchsia' : 'slate'}
          disabled={!canLaydown}
          title={canLaydown ? `Lay-Down is safe: ${losers} potential losers ≤ ${room} room` : `Not a Lay-Down hand: ${losers} potential losers > ${room} room`}
          onClick={() => act({ type: 'TOGGLE_LAYDOWN' })}
        >
          <LayoutGrid size={16} /> Lay-Down {s.laydown && canLaydown ? '✓' : ''}
        </Btn>
        <Btn
          testid="confirm-discard-btn"
          tone="cyan"
          disabled={count !== 5}
          onClick={() => act({ type: 'CONFIRM_DISCARD' })}
        >
          <Check size={16} /> Confirm & Play
        </Btn>
        <Btn testid="concede-preplay-btn" tone="red" onClick={() => act({ type: 'CONCEDE_PREPLAY' })}>
          <Flag size={16} /> Concede
        </Btn>
      </Wrap>
    );
  }

  // LAY-DOWN RESPONSE (human defender)
  if (s.phase === 'laydown' && !isBidder && s.laydownResp['P'] == null) {
    return (
      <Wrap pos="center" hint={`${SEAT_LABEL[s.bidWinner]} declared a Lay-Down — challenge or concede?`}>
        <Btn testid="challenge-btn" tone="red" onClick={() => act({ type: 'LAYDOWN_RESPONSE', seat: 'P', challenge: true })}>
          <Zap size={16} /> Challenge (×2)
        </Btn>
        <Btn testid="concede-laydown-btn" tone="slate" onClick={() => act({ type: 'LAYDOWN_RESPONSE', seat: 'P', challenge: false })}>
          <Flag size={16} /> Concede
        </Btn>
      </Wrap>
    );
  }

  // DEFENDER ACES declaration (human defender, must do before card 1)
  if (s.phase === 'play' && s.humanAcesPending) {
    const a = acesAround(s.hands.P);
    return (
      <Wrap pos="banner" hint="You hold Aces Around — DECLARE before playing card 1 or Bust a Lead!">
        <Btn testid="declare-aces-btn" tone="gold" onClick={() => act({ type: 'DECLARE_ACES', seat: 'P' })}>
          <Sparkles size={16} /> Declare {a?.type === 'double' ? '1000 Aces' : 'Aces Around'}
        </Btn>
      </Wrap>
    );
  }

  // BIDDER DECLARE ACES (must declare before leading an Ace, or forfeit)
  if (s.phase === 'play' && s.bidWinner === 'P' && s.bidderAcesPending) {
    const pts = s.bidderAcesItem?.pts || 10;
    const soft = s.settings.difficulty !== 'hard';
    return (
      <Wrap pos="banner" hint={soft ? 'Declare your Aces Around BEFORE leading an Ace — or forfeit the meld!' : undefined}>
        <Btn testid="declare-bidder-aces-btn" tone="gold" onClick={() => act({ type: 'DECLARE_BIDDER_ACES' })}>
          <Sparkles size={16} /> DECLARE ACES ({pts} PTS)
        </Btn>
      </Wrap>
    );
  }

  // PLAY hint
  if (s.phase === 'play' && s.turn === 'P' && !s.trickPending) {
    const hard = s.settings.difficulty === 'hard';
    const canConcede = isBidder && s.trickNo === 1 && s.trick.length === 0;
    const concedeBtn = canConcede && (
      <Btn testid="concede-hand-btn" tone="red" onClick={() => act({ type: 'CONCEDE_PREPLAY', seat: 'P' })}>
        <Flag size={16} /> Concede Hand
      </Btn>
    );
    if (hard) {
      return (
        <Wrap pos="banner" hint="CONVICT MODE · no help — the yard is watching for reneges">
          <span className="text-xs font-sub text-rose-300">Play any card · renege at your own risk</span>
          {concedeBtn}
        </Wrap>
      );
    }
    return (
      <Wrap pos="banner" hint={s.trick.length === 0 ? 'Your lead — pick any highlighted card' : 'Follow suit · head the book if able'}>
        <span className="text-xs font-sub text-slate-400">Tap a glowing card to play</span>
        {concedeBtn}
      </Wrap>
    );
  }

  return null;
}

export function MeldBoard({ state }) {
  const s = state;
  if (s.bidWinner !== 'P' || !s.meld.P) return null;
  if (!['discard', 'laydown', 'play', 'settlement'].includes(s.phase)) return null;
  const meld = s.meld.P;
  return (
    <div
      data-testid="meld-board"
      className="fixed left-2 top-20 z-30 glass rounded-xl p-3 w-44 hidden lg:block"
    >
      <div className="text-[10px] font-sub uppercase tracking-widest text-cyan-300 mb-1">Your Meld</div>
      {meld.items.length === 0 ? (
        <div className="text-xs text-slate-500">No meld</div>
      ) : (
        <ul className="space-y-1">
          {meld.items.map((it) => (
            <li key={it.name} className="flex justify-between text-[11px]">
              <span className="text-slate-300">{it.name}</span>
              <span className="font-mono-stat text-emerald-300">{it.pts}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-white/10 mt-2 pt-1 flex justify-between text-xs font-bold">
        <span className="text-slate-200">Total</span>
        <span className="font-mono-stat text-yellow-300">{meld.total}</span>
      </div>
    </div>
  );
}
