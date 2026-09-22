import { reducer, initState } from '../reducer';
import { evaluateBid, chooseTrump, chooseDiscards, laydownChallenge, aiPlay } from '../ai';
import { SEATS } from '../constants';

function aiBidAction(s, seat) {
  const { maxBid } = evaluateBid(s.hands[seat], s.settings.bidBase);
  const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
  return maxBid >= nextVal ? { type: 'PLACE_BID', seat } : { type: 'PASS', seat };
}

function stepAI(s) {
  switch (s.phase) {
    case 'dealing':
      return { type: 'DEAL_DONE' };
    case 'auction':
      return aiBidAction(s, s.currentBidder);
    case 'trump': {
      const suit = chooseTrump(s.hands[s.bidWinner]);
      return suit ? { type: 'DECLARE_TRUMP', suit } : { type: 'SOFT_SET' };
    }
    case 'discard': {
      const discards = chooseDiscards(s.hands[s.bidWinner], s.trump);
      return { type: 'AI_CONFIRM_DISCARD', discards, goingDouble: false };
    }
    case 'laydown': {
      const defs = SEATS.filter((x) => x !== s.bidWinner);
      const pend = defs.find((d) => s.laydownResp[d] == null);
      return { type: 'LAYDOWN_RESPONSE', seat: pend, challenge: laydownChallenge(s.hands[pend], s.trump) };
    }
    case 'play': {
      if (s.trickPending) return { type: 'RESOLVE_TRICK' };
      if (s.humanAcesPending) return { type: 'DECLARE_ACES', seat: 'P' };
      const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner);
      return { type: 'PLAY_CARD', seat: s.turn, card };
    }
    default:
      return null;
  }
}

function playHand(state) {
  let s = reducer(state, { type: 'START_ROUND' });
  let guard = 0;
  while (s.phase !== 'settlement' && guard < 5000) {
    const a = stepAI(s);
    if (!a) break;
    s = reducer(s, a);
    guard++;
  }
  return s;
}

test('deck has 80 valid cards dealt 25/25/25 + 5 kitty', () => {
  const s = reducer(initState(), { type: 'START_ROUND' });
  expect(s.hands.W.length).toBe(25);
  expect(s.hands.E.length).toBe(25);
  expect(s.hands.P.length).toBe(25);
  expect(s.kitty.length).toBe(5);
  const all = [...s.hands.W, ...s.hands.E, ...s.hands.P, ...s.kitty];
  expect(all.length).toBe(80);
  expect(new Set(all.map((c) => c.id)).size).toBe(80);
});

test('full hand simulation reaches settlement with conserved bankroll', () => {
  for (let i = 0; i < 60; i++) {
    const start = initState();
    const s = playHand(start);
    expect(s.phase).toBe('settlement');
    expect(s.settlement).toBeTruthy();
    const total = SEATS.reduce((n, k) => n + s.bankrolls[k], 0);
    // zero-sum transfers keep total at 420 unless a bankroll was clamped at 0 (game over)
    if (!s.gameOver) expect(total).toBe(420);
    // A played-out (non-conceded) hand must complete 25 tricks
    if (s.result === 'made' || s.result === 'hard') {
      if (!s.boardSet) {
        expect(s.trickNo).toBe(25);
        const cardsLeft = SEATS.reduce((n, k) => n + s.hands[k].length, 0);
        expect(cardsLeft).toBe(0);
        expect(s.completedBooks.length).toBe(25);
        expect(s.playedIds.length).toBe(75);
      }
    }
  }
});

function zeroMeldHand() {
  const spec = [
    ['S', 'A', 4], ['S', '10', 4],
    ['H', 'K', 4], ['H', 'J', 4],
    ['D', 'A', 2], ['D', '10', 2], ['D', 'K', 2],
    ['C', '10', 4], ['C', 'J', 4],
  ];
  const h = [];
  for (const [suit, rank, n] of spec) for (let i = 0; i < n; i++) h.push({ id: `${suit}-${rank}-${i}`, suit, rank });
  return h; // 30 cards, computeMeld total === 0
}

test('BOARD SET: Bid - Meld > 50 triggers an immediate Hard Set without playing', () => {
  const { computeMeld } = require('../meld');
  const hand = zeroMeldHand();
  expect(computeMeld(hand, 'S').total).toBe(0);
  let s = reducer(initState(), { type: 'START_ROUND' });
  s = reducer(s, { type: 'DEAL_DONE' });
  // Splice in a controlled impossible contract for West.
  s.bidWinner = 'W';
  s.bid = 95;
  s.trump = 'S';
  s.phase = 'discard';
  s.hands.W = hand;
  s.discards = hand.slice(0, 5).map((c) => c.id);
  s = reducer(s, { type: 'CONFIRM_DISCARD' });
  expect(s.boardSet).toBe(true);
  expect(s.phase).toBe('settlement');
  expect(s.result).toBe('hard');
  expect(s.settlement.boardSet).toBe(true);
  expect(s.trickNo).toBe(0); // never played a book
});

test('multiple consecutive hands rotate dealer and never crash', () => {
  let s = initState();
  const firstDealer = s.dealer;
  s = playHand(s);
  s = reducer(s, s.gameOver ? { type: 'NEW_GAME' } : { type: 'NEXT_HAND' });
  // NEXT_HAND rotates dealer + re-deals into dealing phase
  if (!s.gameOver) {
    expect(s.phase).toBe('dealing');
    expect(s.dealer).not.toBe(firstDealer);
  }
});

test('save benchmark is Max(floor, bid - meld) and stats + stakes scale settlement', () => {
  // High stakes hand: verify transfers scale and stats accrue
  let s = initState();
  s = reducer(s, { type: 'UPDATE_SETTINGS', settings: { stakesBase: 5 } });
  s = playHand(s);
  expect(s.phase).toBe('settlement');
  const r = s.settlement;
  // benchmark must respect the 20 (or 31) floor
  const floor = s.goingDouble ? 31 : 20;
  expect(r.benchmark).toBeGreaterThanOrEqual(floor);
  // and must be at least bid - meld
  expect(r.benchmark).toBeGreaterThanOrEqual((s.bid || 0) - (r.meldTotal || 0));
  // stats recorded exactly one hand
  expect(s.stats.handsPlayed).toBe(1);
  // non-busted transfers are multiples of stakesBase(5)
  if (r.result !== 'busted') {
    for (const t of r.transfers) expect(t.amount % 5).toBe(0);
  }
});

test('AI never sloughs off-suit while holding the led suit or trump (strict legality)', () => {
  const { legalPlays } = require('../trick');
  const { aiPlay } = require('../ai');
  // build a contrived mid-trick situation many times via full sims and assert every AI play is legal
  for (let i = 0; i < 20; i++) {
    let s = reducer(initState(), { type: 'START_ROUND' });
    let guard = 0;
    while (s.phase !== 'settlement' && guard < 5000) {
      if (s.phase === 'play' && !s.trickPending && s.turn) {
        const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner);
        const legal = legalPlays(s.hands[s.turn], s.trick, s.trump);
        expect(legal.some((c) => c.id === card.id)).toBe(true);
      }
      const a = stepAI(s);
      if (!a) break;
      s = reducer(s, a);
      guard++;
    }
  }
});

test('auction records a bid log and RESET_TABLE re-deals a fresh $140 table', () => {
  let s = playHand(initState());
  expect(s.bidLog.length).toBeGreaterThan(0);
  s = reducer(s, { type: 'RESET_TABLE' });
  expect(s.bankrolls).toEqual({ W: 140, E: 140, P: 140 });
  expect(s.stats.handsPlayed).toBe(0);
  expect(s.dealer).toBe('P');
  expect(s.phase).toBe('dealing');
  expect(s.hands.P.length).toBe(25);
  expect(s.kitty.length).toBe(5);
});


test('CONVICT bidder bleeds trump: leads highest trump while defenders hold trump', () => {
  const trump = 'S';
  const hand = [
    { id: 'S-A-0', suit: 'S', rank: 'A' },
    { id: 'S-K-0', suit: 'S', rank: 'K' },
    { id: 'S-Q-0', suit: 'S', rank: 'Q' },
    { id: 'H-A-0', suit: 'H', rank: 'A' },
    { id: 'C-J-0', suit: 'C', rank: 'J' },
  ];
  // On lead, no trumps seen yet -> Convict bidder should lead its highest trump (Ace of spades).
  const card = aiPlay('P', hand, [], trump, 'P', null, 'hard', []);
  expect(card.suit).toBe('S');
  expect(card.rank).toBe('A');

  // A normal (Inmate) bidder with the same hand does NOT open by bleeding the top trump
  // (only 3 trumps, threshold is 5) -> should not lead the Ace of spades.
  const normalCard = aiPlay('P', hand, [], trump, 'P', null, 'normal', []);
  expect(normalCard.id).not.toBe('S-A-0');
});

test('MELD: trump run does not double-count the royal marriage (no phantom +4)', () => {
  const { computeMeld } = require('../meld');
  // A,10,K,Q,J of Spades = exactly one Trump Run (15), NO extra Royal Marriage.
  const runOnly = [
    { id: 'S-A-0', suit: 'S', rank: 'A' },
    { id: 'S-10-0', suit: 'S', rank: '10' },
    { id: 'S-K-0', suit: 'S', rank: 'K' },
    { id: 'S-Q-0', suit: 'S', rank: 'Q' },
    { id: 'S-J-0', suit: 'S', rank: 'J' },
  ];
  const m1 = computeMeld(runOnly, 'S');
  expect(m1.total).toBe(15);
  expect(m1.items.find((i) => i.name.includes('Marriage'))).toBeUndefined();

  // A separate, unused K+Q of trump DOES score a Royal Marriage on top of the run.
  const runPlusMarriage = [...runOnly,
    { id: 'S-K-1', suit: 'S', rank: 'K' },
    { id: 'S-Q-1', suit: 'S', rank: 'Q' },
  ];
  const m2 = computeMeld(runPlusMarriage, 'S');
  expect(m2.total).toBe(19); // 15 run + 4 royal marriage
});

test('MELD: Double Pinochle scores 30, Triple 90 (flat, not stacked) and quad 300', () => {
  const { computeMeld } = require('../meld');
  const triple = [
    { id: 'S-Q-0', suit: 'S', rank: 'Q' }, { id: 'S-Q-1', suit: 'S', rank: 'Q' }, { id: 'S-Q-2', suit: 'S', rank: 'Q' },
    { id: 'D-J-0', suit: 'D', rank: 'J' }, { id: 'D-J-1', suit: 'D', rank: 'J' }, { id: 'D-J-2', suit: 'D', rank: 'J' },
  ];
  const m = computeMeld(triple, 'H');
  const pin = m.items.find((i) => i.name.includes('Pinochle'));
  expect(pin.pts).toBe(90);
  expect(pin.name).toContain('90 Nuts');

  const dbl = triple.filter((c) => !c.id.endsWith('-2'));
  const md = computeMeld(dbl, 'H');
  const dp = md.items.find((i) => i.name.includes('Pinochle'));
  expect(dp.name).toBe('Double Pinochle');
  expect(dp.pts).toBe(30);

  const quad = [...triple, { id: 'S-Q-3', suit: 'S', rank: 'Q' }, { id: 'D-J-3', suit: 'D', rank: 'J' }];
  const mq = computeMeld(quad, 'H');
  expect(mq.items.find((i) => i.name.includes('Pinochle')).pts).toBe(300);
});
