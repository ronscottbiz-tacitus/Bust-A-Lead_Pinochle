import { TRICK_RANK, COUNTER_RANKS } from './constants';

// Does card x beat card y given the led suit and trump?
export function cardWins(x, y, led, trump) {
  const xt = x.suit === trump;
  const yt = y.suit === trump;
  if (xt && !yt) return true;
  if (!xt && yt) return false;
  if (xt && yt) return TRICK_RANK[x.rank] > TRICK_RANK[y.rank];
  const xl = x.suit === led;
  const yl = y.suit === led;
  if (xl && !yl) return true;
  if (!xl && yl) return false;
  if (xl && yl) return TRICK_RANK[x.rank] > TRICK_RANK[y.rank];
  return false;
}

// trick: array of { seat, card }
export function currentWinnerIndex(trick, trump) {
  if (!trick.length) return -1;
  const led = trick[0].card.suit;
  let wi = 0;
  for (let i = 1; i < trick.length; i++) {
    if (cardWins(trick[i].card, trick[wi].card, led, trump)) wi = i;
  }
  return wi;
}

// Legal plays enforcing: follow suit + head trick; else trump + overtrump; else any.
export function legalPlays(hand, trick, trump) {
  if (trick.length === 0) return [...hand];
  const led = trick[0].card.suit;
  const ledCards = hand.filter((c) => c.suit === led);
  const winIdx = currentWinnerIndex(trick, trump);
  const winCard = trick[winIdx].card;

  if (ledCards.length) {
    // Must head the trick if the current winner is still a led-suit card
    if (winCard.suit === led) {
      const beating = ledCards.filter((c) => TRICK_RANK[c.rank] > TRICK_RANK[winCard.rank]);
      if (beating.length) return beating;
    }
    return ledCards;
  }

  const trumps = hand.filter((c) => c.suit === trump);
  if (trumps.length) {
    const trumpInTrick = trick.filter((p) => p.card.suit === trump);
    if (trumpInTrick.length) {
      const highT = Math.max(...trumpInTrick.map((p) => TRICK_RANK[p.card.rank]));
      const over = trumps.filter((c) => TRICK_RANK[c.rank] > highT);
      if (over.length) return over;
    }
    return trumps;
  }
  return [...hand];
}

export function trickBooks(trick) {
  return trick.reduce((n, p) => n + (COUNTER_RANKS.has(p.card.rank) ? 1 : 0), 0);
}

// Public alias — enforces the strict Cutthroat trick hierarchy:
// 1) follow suit (and head the trick if able), 2) if void must trump & overtrump if able,
// 3) may only slough an off-suit card when void in BOTH the led suit and trump.
export const getPlayableCards = legalPlays;
