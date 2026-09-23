// Dynamic "books to save / to make" scoring helpers.
export function booksToMake({ bid, meldTotal }) {
  return Math.max(0, (bid || 0) - (meldTotal || 0));
}
export function saveTarget({ bid, meldTotal, goingDouble }) {
  const floor = goingDouble ? 31 : 20;
  return Math.max(floor, (bid || 0) - (meldTotal || 0));
}

// 48 counters (A/10/K × 4 copies × 4 suits) + 2 for the last book.
export const TOTAL_POINTS = 50;
export const LAYDOWN_MARGIN = 4;

// "Potential losers" — points a bidder can bleed to the defense from off-trump cards:
// a losing Q/J gives up the ~2 counters the defenders put on that book (2); a losing 10/K
// gives up those plus its own counter (3). Aces and trump are assumed winners (0).
export function potentialLosers(hand, trump) {
  let n = 0;
  for (const c of hand) {
    if (c.suit === trump || c.rank === 'A') continue;
    n += c.rank === 'Q' || c.rank === 'J' ? 2 : 3;
  }
  return n;
}

// Lay-Down viability on the KEPT hand: the bidder may give up at most TOTAL_POINTS − bench.
export function laydownRoom(bench) {
  return Math.max(0, TOTAL_POINTS - bench);
}
export function laydownSafe(hand, trump, bench) {
  return potentialLosers(hand, trump) <= laydownRoom(bench) - LAYDOWN_MARGIN;
}
