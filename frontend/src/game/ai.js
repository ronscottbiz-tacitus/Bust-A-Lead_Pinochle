import { SUIT_KEYS, TRICK_RANK, COUNTER_RANKS } from './constants';
import { legalPlays, currentWinnerIndex } from './trick';

function bySuit(hand) {
  const m = { S: [], H: [], D: [], C: [] };
  for (const c of hand) m[c.suit].push(c);
  return m;
}
function countRank(cards, rank) {
  return cards.filter((c) => c.rank === rank).length;
}

// Evaluate hand and return the max bid this seat is willing to make.
export function evaluateBid(hand, base) {
  const m = bySuit(hand);
  let hasMarriage = false;
  let bestSuitScore = 0;
  for (const s of SUIT_KEYS) {
    const cards = m[s];
    const len = cards.length;
    const a = countRank(cards, 'A');
    const t = countRank(cards, '10');
    const k = countRank(cards, 'K');
    const q = countRank(cards, 'Q');
    const j = countRank(cards, 'J');
    const marriage = k > 0 && q > 0;
    if (marriage) hasMarriage = true;
    const run = Math.min(a, t, k, q, j) >= 1 ? 8 : 0;
    const sc = len * 1.6 + a * 3 + t * 1.4 + (marriage ? 4 : 0) + run;
    if (marriage && sc > bestSuitScore) bestSuitScore = sc;
  }
  if (!hasMarriage) return { maxBid: 0 };
  const totalAces = hand.filter((c) => c.rank === 'A').length;
  const score = bestSuitScore + totalAces * 1.4;
  const extra = Math.max(0, Math.floor((score - 15) / 3.5));
  const jitter = Math.random() < 0.4 ? -1 : 0;
  const steps = Math.min(Math.max(extra + jitter, 0), 8);
  return { maxBid: base + 5 * steps };
}

export function chooseTrump(hand) {
  const m = bySuit(hand);
  let best = null;
  let bestScore = -1;
  for (const s of SUIT_KEYS) {
    const cards = m[s];
    const marriage = countRank(cards, 'K') > 0 && countRank(cards, 'Q') > 0;
    if (!marriage) continue;
    const score =
      cards.length * 2 + countRank(cards, 'A') * 3 + countRank(cards, '10') * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

// Bury 5 lowest-value non-trump cards, keeping trump + aces.
export function chooseDiscards(hand, trump) {
  const scored = hand.map((c) => ({
    c,
    v: TRICK_RANK[c.rank] + (c.suit === trump ? 100 : 0) + (c.rank === 'A' ? 50 : 0),
  }));
  scored.sort((a, b) => a.v - b.v);
  return scored.slice(0, 5).map((x) => x.c.id);
}

export function shouldGoDouble(hand, trump) {
  const trumpLen = hand.filter((c) => c.suit === trump).length;
  const aces = hand.filter((c) => c.rank === 'A').length;
  return trumpLen >= 11 && aces >= 4;
}

// Defender decides whether to challenge an exposed lay-down.
export function laydownChallenge(hand, trump) {
  const trumpLen = hand.filter((c) => c.suit === trump).length;
  const aces = hand.filter((c) => c.rank === 'A').length;
  return trumpLen >= 4 || aces >= 5;
}

function lowest(cards) {
  return [...cards].sort((a, b) => TRICK_RANK[a.rank] - TRICK_RANK[b.rank])[0];
}
function highest(cards) {
  return [...cards].sort((a, b) => TRICK_RANK[b.rank] - TRICK_RANK[a.rank])[0];
}
function wouldWin(card, trick, trump, seat) {
  const t = [...trick, { seat, card }];
  return currentWinnerIndex(t, trump) === t.length - 1;
}

// AI card selection during trick play. Defenders cooperate against the bidder.
export function aiPlay(seat, hand, trick, trump, bidWinner) {
  const legal = legalPlays(hand, trick, trump);
  if (legal.length === 1) return legal[0];
  const isDefender = bidWinner != null && seat !== bidWinner;

  if (trick.length === 0) {
    // Leading: cash an off-suit Ace to grab counters, else lead a low card.
    const offAces = legal.filter((c) => c.rank === 'A' && c.suit !== trump);
    if (offAces.length) return offAces[0];
    const nonCounter = legal.filter((c) => !COUNTER_RANKS.has(c.rank));
    return lowest(nonCounter.length ? nonCounter : legal);
  }

  const winIdx = currentWinnerIndex(trick, trump);
  const winnerSeat = trick[winIdx].seat;
  const winners = legal.filter((c) => wouldWin(c, trick, trump, seat));
  const nonWinning = legal.filter((c) => !wouldWin(c, trick, trump, seat));

  // Cooperative defence: my partner (the other defender) is currently taking the book.
  // If the rules let me play a non-winning card, feed the biggest counter into their book.
  const partnerWinning = isDefender && winnerSeat !== seat && winnerSeat !== bidWinner;
  if (partnerWinning && nonWinning.length) {
    const counters = nonWinning.filter((c) => COUNTER_RANKS.has(c.rank));
    if (counters.length) return highest(counters);
    return lowest(nonWinning);
  }

  if (winners.length) {
    // Take the book with the cheapest winning card (defenders aggressively cut the bidder).
    return lowest(winners);
  }

  // Can't win: never feed counters to whoever is winning — throw the lowest non-counter.
  const nonCounter = legal.filter((c) => !COUNTER_RANKS.has(c.rank));
  return lowest(nonCounter.length ? nonCounter : legal);
}
