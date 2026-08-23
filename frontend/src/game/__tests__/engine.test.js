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
    // zero-sum transfers keep total at 300 unless a bankroll was clamped at 0 (game over)
    if (!s.gameOver) expect(total).toBe(300);
    // A played-out (non-conceded) hand must complete 25 tricks
    if (s.result === 'made' || s.result === 'hard') {
      expect(s.trickNo).toBe(25);
      const cardsLeft = SEATS.reduce((n, k) => n + s.hands[k].length, 0);
      expect(cardsLeft).toBe(0);
    }
  }
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
