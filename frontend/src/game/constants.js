// Core constants for Bus' a Lead (3-player Cutthroat Pinochle variant)

import { CHARACTERS, DEFAULT_SEAT_CHARS } from '../config/characters';

export const SEATS = ['W', 'E', 'P'];
// Per-seat character identity — mutable, updated at runtime via applySeatRoster().
// Kept as live objects (not rebuilt) so every existing SEAT_LABEL[seat] read stays valid.
export const SEAT_LABEL = {};
export const SEAT_AVATAR = {};
export const SEAT_MONIKER = {};
export const SEAT_CHAR = {};

export function applySeatRoster(seatChars = DEFAULT_SEAT_CHARS) {
  for (const seat of SEATS) {
    const id = (seatChars && seatChars[seat]) || DEFAULT_SEAT_CHARS[seat];
    const ch = CHARACTERS[id] || CHARACTERS[DEFAULT_SEAT_CHARS[seat]];
    SEAT_CHAR[seat] = ch.id;
    SEAT_LABEL[seat] = ch.name;
    SEAT_AVATAR[seat] = ch.avatar;
    SEAT_MONIKER[seat] = ch.moniker;
  }
}
applySeatRoster(); // initialize with defaults at module load
// CDCR historical Maximum Monthly Canteen Draw — every seat starts the match with it.
export const START_BANKROLL = 140;
export const startingBankrolls = () => ({ W: START_BANKROLL, E: START_BANKROLL, P: START_BANKROLL });
export const CARD_BACK_IMG = '/assets/get2_cardback.png';
export const TABLE_BG_IMG = '/assets/new_canteen_table.webp';
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
