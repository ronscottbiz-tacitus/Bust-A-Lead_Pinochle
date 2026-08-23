import { SUITS, RANK_ORDER, TRICK_RANK, SUIT_KEYS } from './constants';

// 80 cards: two 48-card pinochle decks with 9s stripped => 4 copies of A,10,K,Q,J in each suit
export function makeDeck() {
  const d = [];
  for (const s of SUITS) {
    for (const r of RANK_ORDER) {
      for (let c = 0; c < 4; c++) {
        d.push({ id: `${s.key}-${r}-${c}`, suit: s.key, rank: r });
      }
    }
  }
  return d;
}

export function shuffle(arr) {
  const x = [...arr];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

// Deal 25 cards to each of W, E, P in 5-card packets clockwise, 5 cards to the Kitty
// placed in the middle of the deal (never first or last 5).
export function dealDeck() {
  const deck = shuffle(makeDeck());
  const seatSeq = [];
  for (let r = 0; r < 5; r++) seatSeq.push('W', 'E', 'P'); // 15 packets
  seatSeq.splice(7, 0, 'K'); // insert kitty packet in the middle -> 16 packets

  const hands = { W: [], E: [], P: [] };
  const kitty = [];
  const packets = [];
  let i = 0;
  for (const s of seatSeq) {
    const cards = deck.slice(i, i + 5);
    i += 5;
    packets.push({ seat: s, cards });
    if (s === 'K') kitty.push(...cards);
    else hands[s].push(...cards);
  }
  return { hands, kitty, packets };
}

function suitPos(suit, trump) {
  const base = SUIT_KEYS.indexOf(suit);
  return suit === trump ? -1 : base;
}

export function sortHand(hand, mode = 'suit', trump = null) {
  const arr = [...hand];
  if (mode === 'rank') {
    arr.sort(
      (a, b) =>
        TRICK_RANK[b.rank] - TRICK_RANK[a.rank] ||
        suitPos(a.suit, trump) - suitPos(b.suit, trump)
    );
  } else {
    arr.sort(
      (a, b) =>
        suitPos(a.suit, trump) - suitPos(b.suit, trump) ||
        TRICK_RANK[b.rank] - TRICK_RANK[a.rank]
    );
  }
  return arr;
}
