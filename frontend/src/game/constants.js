// Core constants for Bus' a Lead (3-player Cutthroat Pinochle variant)

export const SEATS = ['W', 'E', 'P'];
export const SEAT_LABEL = { W: 'DooLow', E: 'PapaCap', P: 'G2' };
// Avatar image assets per seat (E has no portrait -> null, falls back to initial)
export const SEAT_AVATAR = {
  W: '/assets/avatar_them.png',
  E: '/assets/avatar_yall.png',
  P: '/assets/avatar_g2.png',
};
export const CARD_BACK_IMG = '/assets/get2_cardback.png';
export const TABLE_BG_IMG = '/assets/table_bg.png';
// Clockwise seating order used for dealing and turn rotation
export const CLOCKWISE = ['W', 'E', 'P'];

export function nextSeat(seat) {
  const i = CLOCKWISE.indexOf(seat);
  return CLOCKWISE[(i + 1) % CLOCKWISE.length];
}
export function leftOf(seat) {
  return nextSeat(seat);
}

export const SUITS = [
  { key: 'S', name: 'Spades', symbol: '♠', text: 'text-slate-900', neon: '#38bdf8' },
  { key: 'H', name: 'Hearts', symbol: '♥', text: 'text-rose-600', neon: '#f43f5e' },
  { key: 'D', name: 'Diamonds', symbol: '♦', text: 'text-orange-600', neon: '#fb923c' },
  { key: 'C', name: 'Clubs', symbol: '♣', text: 'text-emerald-600', neon: '#34d399' },
];
export const SUIT_BY_KEY = Object.fromEntries(SUITS.map((s) => [s.key, s]));
export const SUIT_KEYS = ['S', 'H', 'D', 'C'];

// Display order high -> low
export const RANK_ORDER = ['A', '10', 'K', 'Q', 'J'];
// Trick-taking rank power
export const TRICK_RANK = { A: 5, '10': 4, K: 3, Q: 2, J: 1 };
// Counters worth 1 book each when captured
export const COUNTER_RANKS = new Set(['A', '10', 'K']);
export function isCounter(card) {
  return COUNTER_RANKS.has(card.rank);
}

export const SPEED = {
  slow: { deal: 2400, think: 1100, trick: 1500 },
  normal: { deal: 1500, think: 650, trick: 950 },
  fast: { deal: 700, think: 280, trick: 500 },
};
