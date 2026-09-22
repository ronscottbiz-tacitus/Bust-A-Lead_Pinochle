import { reducer, initState } from '../reducer';
import { aiPlay, seatVoids, SKILL_RATING } from '../ai';
import { legalPlays } from '../trick';
import { evaluateBid, chooseTrump, chooseDiscards, laydownChallenge } from '../ai';
import { SEATS } from '../constants';

const c = (suit, rank, i = 0) => ({ id: `${suit}-${rank}-${i}`, suit, rank });

test('THROW_IN: human bidder surrenders mid-hand as a full Hard Set (-2 x mult x stakes per defender)', () => {
  let s = initState();
  s = reducer(s, { type: 'UPDATE_SETTINGS', settings: { stakesBase: 2 } });
  s = reducer(s, { type: 'START_ROUND' });
  s = reducer(s, { type: 'DEAL_DONE' });
  // Force the human into an active Spades contract, Going Double (compound ×4).
  s.phase = 'play';
  s.bidWinner = 'P';
  s.bid = 70;
  s.trump = 'S';
  s.goingDouble = true;
  s.turn = 'P';
  s.trickNo = 3;
  s.meld = { W: null, E: null, P: { total: 20, items: [], allCards: [] } };
  s = reducer(s, { type: 'THROW_IN' });
  expect(s.phase).toBe('settlement');
  expect(s.result).toBe('hard');
  expect(s.thrownIn).toBe(true);
  expect(s.conceded).toBe(true);
  expect(s.playedOut).toBe(false);
  const r = s.settlement;
  expect(r.mult).toBe(4);
  expect(r.label).toMatch(/Threw It In/);
  // -2 unit × 4 mult × $2 stakes = $16 to EACH defender.
  expect(r.transfers).toHaveLength(2);
  for (const t of r.transfers) {
    expect(t.from).toBe('P');
    expect(t.amount).toBe(16);
  }
  expect(s.bankrolls.P).toBe(140 - 32);
  expect(s.bankrolls.W).toBe(156);
  expect(s.bankrolls.E).toBe(156);
});

test('THROW_IN is ignored unless the human is the active bidder in play', () => {
  let s = reducer(initState(), { type: 'START_ROUND' });
  const before = s;
  s = reducer(s, { type: 'THROW_IN' });
  expect(s).toBe(before);
  s.phase = 'play';
  s.bidWinner = 'W';
  expect(reducer(s, { type: 'THROW_IN' })).toBe(s);
});

test('multipliers compound exponentially: Going Double × Lay-Down Challenged × Spades = 8x', () => {
  let s = reducer(initState(), { type: 'START_ROUND' });
  s = reducer(s, { type: 'DEAL_DONE' });
  s.phase = 'play';
  s.bidWinner = 'P';
  s.bid = 70;
  s.trump = 'S';
  s.goingDouble = true;
  s.laydownChallenged = true;
  s.meld = { W: null, E: null, P: { total: 20, items: [], allCards: [] } };
  s = reducer(s, { type: 'THROW_IN' });
  expect(s.settlement.mult).toBe(8);
  expect(s.settlement.transfers[0].amount).toBe(16);
});

test('seatVoids infers suit voids from legal off-suit plays', () => {
  const log = [
    { seat: 'W', playIndex: 0, legal: true, card: c('H', 'A'), leadCard: c('H', 'A') },
    { seat: 'E', playIndex: 1, legal: true, card: c('C', 'J'), leadCard: c('H', 'A') },
    { seat: 'P', playIndex: 2, legal: true, card: c('H', 'K'), leadCard: c('H', 'A') },
    { seat: 'P', playIndex: 1, legal: false, card: c('D', 'J'), leadCard: c('S', 'A') },
  ];
  expect(seatVoids(log)).toEqual({ W: [], E: ['H'], P: [] });
});

test('SHOOTER defender exploits a partner void: leads the suit partner can cut', () => {
  const trump = 'S';
  const hand = [c('H', 'J'), c('H', 'Q'), c('D', 'A'), c('C', 'K'), c('C', '10')];
  // W leads as defender; partner E is void in Hearts, bidder P still holds Hearts.
  const ctx = { voids: { W: [], E: ['H'], P: [] }, bidderBooks: 5, bench: 20, skill: 'shooter' };
  for (let i = 0; i < 20; i++) {
    const card = aiPlay('W', hand, [], trump, 'P', null, 'normal', [], 0, ctx);
    expect(card.suit).toBe('H');
    expect(['J', 'Q']).toContain(card.rank);
  }
});

test('SHOOTER defender starves counters: never volunteers a 10/K under a bidder who may hold the Ace', () => {
  const trump = 'S';
  // Partner (W) led the Jack of Hearts; bidder P plays after E. E holds 10♥ K♥ Q♥.
  const trick = [{ seat: 'W', card: c('H', 'J') }];
  const hand = [c('H', '10'), c('H', 'K'), c('H', 'Q'), c('C', 'A')];
  const ctx = { voids: { W: [], E: [], P: [] }, bidderBooks: 5, bench: 20, skill: 'shooter' };
  for (let i = 0; i < 20; i++) {
    const card = aiPlay('E', hand, trick, trump, 'P', null, 'normal', [], 0, ctx);
    expect(legalPlays(hand, trick, trump).some((l) => l.id === card.id)).toBe(true);
    expect(card.id).toBe('H-Q-0');
  }
});

test('SHOOTER defender ace-hunts: takes the bidder\'s winning book with the cheapest legal winner', () => {
  const trump = 'S';
  const trick = [{ seat: 'P', card: c('D', '10') }, { seat: 'W', card: c('D', 'J') }];
  const hand = [c('S', 'J'), c('S', 'A'), c('C', 'Q')]; // void in Diamonds -> must trump; picks lowest trump
  const ctx = { voids: {}, bidderBooks: 18, bench: 20, skill: 'shooter' };
  const card = aiPlay('E', hand, trick, trump, 'P', null, 'normal', [], 0, ctx);
  expect(card.id).toBe('S-J-0');
});

test('Skillz ratings are 65% / 75% / 100% and every skill tier only ever plays legal cards', () => {
  expect(SKILL_RATING).toEqual({ dumptruck: 0.65, alight: 0.75, shooter: 1.0 });
  const step = (s, skill) => {
    switch (s.phase) {
      case 'dealing': return { type: 'DEAL_DONE' };
      case 'auction': {
        const { maxBid } = evaluateBid(s.hands[s.currentBidder], s.settings.bidBase);
        const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
        return maxBid >= nextVal ? { type: 'PLACE_BID', seat: s.currentBidder } : { type: 'PASS', seat: s.currentBidder };
      }
      case 'trump': { const suit = chooseTrump(s.hands[s.bidWinner]); return suit ? { type: 'DECLARE_TRUMP', suit } : { type: 'SOFT_SET' }; }
      case 'discard': return { type: 'AI_CONFIRM_DISCARD', discards: chooseDiscards(s.hands[s.bidWinner], s.trump), goingDouble: false };
      case 'laydown': { const d = SEATS.filter((x) => x !== s.bidWinner).find((x) => s.laydownResp[x] == null); return { type: 'LAYDOWN_RESPONSE', seat: d, challenge: laydownChallenge(s.hands[d], s.trump) }; }
      case 'play': {
        if (s.trickPending) return { type: 'RESOLVE_TRICK' };
        if (s.humanAcesPending) return { type: 'DECLARE_ACES', seat: 'P' };
        const ctx = { voids: seatVoids(s.playLog), bidderBooks: s.books[s.bidWinner] + s.buriedBooks, bench: 20, skill };
        const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner, s.signals?.[s.turn], 'normal', s.playedIds, 0, ctx);
        expect(legalPlays(s.hands[s.turn], s.trick, s.trump).some((l) => l.id === card.id)).toBe(true);
        return { type: 'PLAY_CARD', seat: s.turn, card };
      }
      default: return null;
    }
  };
  for (const skill of ['dumptruck', 'alight', 'shooter']) {
    for (let i = 0; i < 8; i++) {
      let s = reducer(initState(), { type: 'START_ROUND' });
      let guard = 0;
      while (s.phase !== 'settlement' && guard++ < 5000) {
        const a = step(s, skill);
        if (!a) break;
        s = reducer(s, a);
      }
      expect(s.phase).toBe('settlement');
    }
  }
});
