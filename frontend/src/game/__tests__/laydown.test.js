import { potentialLosers, laydownRoom, laydownSafe, TOTAL_POINTS, LAYDOWN_MARGIN } from '../scoring';
import { laydownChallenge } from '../ai';
import { reducer, initState } from '../reducer';

const c = (suit, rank, i = 0) => ({ id: `${suit}-${rank}-${i}`, suit, rank });
const mk = (spec) => spec.flatMap(([suit, ranks]) => ranks.map((r, i) => c(suit, r, i)));

// The user's reference hand (trump ♠): 30 potential losers off-trump.
const REF_HAND = mk([
  ['S', ['A', 'A', 'A', '10', 'K', 'K', 'Q', 'J']],
  ['H', ['A', 'K', 'J', 'J']],
  ['D', ['A', 'A', '10', '10', 'Q', 'Q', 'J']],
  ['C', ['A', '10', 'Q', 'Q', 'J', 'J']],
]);

test('potentialLosers: Q/J = 2, 10/K = 3, Aces + trump = 0 (reference hand = 30)', () => {
  expect(TOTAL_POINTS).toBe(50);
  expect(potentialLosers(REF_HAND, 'S')).toBe(30);
  expect(potentialLosers(mk([['H', ['A', 'A', 'A']]]), 'S')).toBe(0);
  expect(potentialLosers(mk([['H', ['K', '10', 'Q', 'J']]]), 'S')).toBe(10);
  expect(potentialLosers(mk([['S', ['K', '10', 'Q', 'J']]]), 'S')).toBe(0);
});

test('laydownSafe: losers must fit inside 50 − bench − margin', () => {
  expect(laydownRoom(20)).toBe(30);
  // 30 losers vs room 30 − 4 = 26 → NOT a lay-down at the 20 floor.
  expect(laydownSafe(REF_HAND, 'S', 20)).toBe(false);
  // Bury the K♥ and both 10♦ (−9) → 21 losers ≤ 26 → safe.
  const trimmed = REF_HAND.filter((x) => !['H-K-1', 'D-10-2', 'D-10-3'].includes(x.id));
  expect(potentialLosers(trimmed, 'S')).toBe(21);
  expect(laydownSafe(trimmed, 'S', 20)).toBe(true);
  // Higher bench shrinks the room.
  expect(laydownSafe(trimmed, 'S', 30)).toBe(false);
  expect(LAYDOWN_MARGIN).toBe(4);
});

test('laydownChallenge reads the laid-down hand: borderline → challenge, clearly safe → concede', () => {
  const weakDef = mk([['H', ['Q', 'J', 'J', 'Q']], ['D', ['Q', 'J']]]);
  const strongDef = mk([['S', ['A', '10', 'K', 'Q']], ['H', ['J']]]);
  // pressure = 21 / 30 = 0.70 → only a strong defender challenges.
  const borderline = REF_HAND.filter((x) => !['H-K-1', 'D-10-2', 'D-10-3'].includes(x.id));
  expect(laydownChallenge(weakDef, 'S', { bidderHand: borderline, bench: 20 })).toBe(false);
  expect(laydownChallenge(strongDef, 'S', { bidderHand: borderline, bench: 20 })).toBe(true);
  // pressure ≥ 0.85 → everyone challenges (26 / 30).
  const hot = REF_HAND.filter((x) => !['H-J-2', 'H-J-3'].includes(x.id));
  expect(laydownChallenge(weakDef, 'S', { bidderHand: hot, bench: 20 })).toBe(true);
  // Clearly safe (few losers) → even a strong defender concedes.
  const lock = mk([['S', ['A', 'A', '10', '10', 'K', 'K', 'Q', 'J']], ['H', ['A', 'A']], ['D', ['A', 'A', 'J']], ['C', ['A', 'A']]]);
  expect(laydownChallenge(strongDef, 'S', { bidderHand: lock, bench: 20 })).toBe(false);
  // Legacy call without context keeps the raw hand-strength rule.
  expect(laydownChallenge(strongDef, 'S')).toBe(true);
  expect(laydownChallenge(weakDef, 'S')).toBe(false);
});

test('LAYDOWN_RESPONSE records the showdown outcome for the verdict modal', () => {
  const base = () => {
    let s = reducer(initState(), { type: 'START_ROUND' });
    s = reducer(s, { type: 'DEAL_DONE' });
    s.phase = 'laydown';
    s.bidWinner = 'P';
    s.bid = 60;
    s.trump = 'H';
    s.laydown = true;
    s.laydownResp = {};
    s.meld = { W: null, E: null, P: { total: 30, items: [], allCards: [] } };
    return s;
  };
  let s = base();
  s = reducer(s, { type: 'LAYDOWN_RESPONSE', seat: 'W', challenge: false });
  expect(s.laydownOutcome).toBeNull();
  s = reducer(s, { type: 'LAYDOWN_RESPONSE', seat: 'E', challenge: true });
  expect(s.laydownOutcome).toMatchObject({ result: 'challenged', challengers: ['E'], responses: { W: false, E: true } });
  expect(s.phase).toBe('play');
  expect(s.laydownChallenged).toBe(true);
  expect(s.bidderExposed).toBe(true);

  let t = base();
  t = reducer(t, { type: 'LAYDOWN_RESPONSE', seat: 'W', challenge: false });
  t = reducer(t, { type: 'LAYDOWN_RESPONSE', seat: 'E', challenge: false });
  expect(t.laydownOutcome).toMatchObject({ result: 'conceded', challengers: [] });
  expect(t.phase).toBe('settlement');
  expect(t.laydownUnchallenged).toBe(true);
  expect(t.settlement.transfers.every((x) => x.to === 'P')).toBe(true);
});

test('CONFIRM_DISCARD drops an unsafe Lay-Down claim instead of entering the laydown phase', () => {
  let s = reducer(initState(), { type: 'START_ROUND' });
  s = reducer(s, { type: 'DEAL_DONE' });
  s.phase = 'discard';
  s.bidWinner = 'P';
  s.bid = 60;
  s.trump = 'S';
  s.laydown = true;
  // Give P a loser-heavy 30-card hand (25 kept after burying 5 low trump cards).
  s.hands.P = [
    ...mk([['S', ['A', 'A', 'K', 'Q', 'Q', 'J', 'J', 'J', 'J', 'K']]]),
    ...mk([['H', ['K', 'K', '10', '10', 'Q', 'Q', 'J']]]),
    ...mk([['D', ['K', 'K', '10', '10', 'Q', 'Q', 'J']]]),
    ...mk([['C', ['K', '10', '10', 'Q', 'Q', 'J']]]),
  ];
  s.discards = ['S-J-0', 'S-J-1', 'S-J-2', 'S-J-3', 'S-Q-0'];
  s = reducer(s, { type: 'CONFIRM_DISCARD' });
  expect(s.laydown).toBe(false);
  expect(s.phase).not.toBe('laydown');
});
