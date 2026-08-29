import { reducer, initState } from '../reducer';
import { SEATS } from '../constants';
import {
  evaluateBid,
  chooseTrump,
  chooseDiscards,
  shouldGoDouble,
  laydownChallenge,
  aiPlay,
} from '../ai';

// Deterministic-ish synchronous driver: resolves any non-human decision the
// game loop would normally make, so a whole hand can be played out in a test.
function nextAction(s) {
  switch (s.phase) {
    case 'dealing':
      return { type: 'DEAL_DONE' };
    case 'auction': {
      if (!s.currentBidder) return null;
      const { maxBid } = evaluateBid(s.hands[s.currentBidder], s.settings.bidBase, s.settings.difficulty);
      const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
      return maxBid >= nextVal ? { type: 'PLACE_BID', seat: s.currentBidder } : { type: 'PASS', seat: s.currentBidder };
    }
    case 'trump': {
      const suit = chooseTrump(s.hands[s.bidWinner]);
      return suit ? { type: 'DECLARE_TRUMP', suit } : { type: 'SOFT_SET' };
    }
    case 'discard': {
      const discards = chooseDiscards(s.hands[s.bidWinner], s.trump);
      const goingDouble = shouldGoDouble(s.hands[s.bidWinner], s.trump);
      return { type: 'AI_CONFIRM_DISCARD', discards, goingDouble };
    }
    case 'laydown': {
      const defs = SEATS.filter((x) => x !== s.bidWinner);
      const pending = defs.filter((x) => s.laydownResp[x] == null);
      if (pending.length) {
        const seat = pending[0];
        return { type: 'LAYDOWN_RESPONSE', seat, challenge: laydownChallenge(s.hands[seat], s.trump) };
      }
      return null;
    }
    case 'play': {
      if (s.bidderAcesPending) return { type: 'DECLARE_BIDDER_ACES' };
      if (s.humanAcesPending) return { type: 'DECLARE_ACES', seat: 'P' };
      if (!s.aiConcedeChecked && s.bidWinner !== 'P' && s.trickNo === 1 && s.trick.length === 0 && s.turn === s.bidWinner) {
        return { type: 'AI_CONCEDE_CHECKED' }; // never auto-concede in this audit
      }
      if (s.trickPending) return { type: 'RESOLVE_TRICK' };
      if (s.turn) {
        const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner, s.signals?.[s.turn], s.settings.difficulty, s.playedIds);
        return { type: 'PLAY_CARD', seat: s.turn, card };
      }
      return null;
    }
    default:
      return null;
  }
}

function playHand() {
  let s = initState();
  s = reducer(s, { type: 'START_ROUND' });
  let guard = 0;
  while (s.phase !== 'settlement' && guard < 5000) {
    const a = nextAction(s);
    if (!a) break;
    s = reducer(s, a);
    guard += 1;
  }
  return s;
}

test('every fully played-out hand accounts for exactly 50 books (48 counters + 2 bonus), including buried/kitty counters', () => {
  let playedOut = 0;
  for (let i = 0; i < 120; i++) {
    const s = playHand();
    if (!s.playedOut) continue;
    playedOut += 1;
    const total = s.books.W + s.books.E + s.books.P + s.buriedBooks;
    expect(total).toBe(50);
    // Buried (kitty) counters belong to the bidder and must feed the bidder's book total.
    const bidderBooks = s.books[s.bidWinner] + s.buriedBooks;
    expect(s.settlement.bidderBooks).toBe(bidderBooks);
  }
  // Make sure the simulation actually exercised played-out hands.
  expect(playedOut).toBeGreaterThan(0);
});

test('bidder meld total always equals the sum of its item points', () => {
  for (let i = 0; i < 120; i++) {
    const s = playHand();
    const meld = s.meld[s.bidWinner];
    if (!meld) continue;
    const sum = meld.items.reduce((n, it) => n + it.pts, 0);
    expect(meld.total).toBe(sum);
    expect(meld.total).toBeGreaterThanOrEqual(0);
  }
});
