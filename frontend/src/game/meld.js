import { SUIT_KEYS, SUIT_BY_KEY } from './constants';

function counts(hand) {
  const cnt = {};
  for (const s of SUIT_KEYS) cnt[s] = { A: 0, '10': 0, K: 0, Q: 0, J: 0 };
  for (const c of hand) cnt[c.suit][c.rank]++;
  return cnt;
}

// Compute bidder meld board for display, including the exact cards forming each meld.
export function computeMeld(hand, trump) {
  const cnt = counts(hand);
  const items = [];
  // pick n cards of a given suit+rank starting from an offset (so run/marriage never reuse a card)
  const pickFrom = (suit, rank, start, n) =>
    hand.filter((c) => c.suit === suit && c.rank === rank).slice(start, start + n);
  const pick = (suit, rank, n = 1) => pickFrom(suit, rank, 0, n);

  // 1) Trump Run FIRST — A,10,K,Q,J of trump. Consumes those K/Q so they can't also score a marriage.
  let usedTrumpK = 0;
  let usedTrumpQ = 0;
  if (trump) {
    const t = cnt[trump];
    const runs = Math.min(t.A, t['10'], t.K, t.Q, t.J);
    if (runs >= 1) {
      const n = runs >= 2 ? 2 : 1;
      const cards = ['A', '10', 'K', 'Q', 'J'].flatMap((r) => pick(trump, r, n));
      items.push({ name: n === 2 ? 'Double Trump Run' : 'Trump Run', pts: n === 2 ? 150 : 15, cards });
      usedTrumpK = n;
      usedTrumpQ = n;
    }
  }

  // 2) Marriages — using only K/Q NOT already consumed by the trump run.
  const availMarriage = {};
  for (const s of SUIT_KEYS) {
    const k = cnt[s].K - (s === trump ? usedTrumpK : 0);
    const q = cnt[s].Q - (s === trump ? usedTrumpQ : 0);
    availMarriage[s] = Math.max(0, Math.min(k, q));
  }
  const marriageSuits = SUIT_KEYS.filter((s) => availMarriage[s] > 0);
  if (marriageSuits.length === 4 && SUIT_KEYS.every((s) => availMarriage[s] >= 1)) {
    const cards = [];
    for (const s of SUIT_KEYS) {
      const kOff = s === trump ? usedTrumpK : 0;
      const qOff = s === trump ? usedTrumpQ : 0;
      cards.push(...pickFrom(s, 'K', kOff, 1), ...pickFrom(s, 'Q', qOff, 1));
    }
    items.push({ name: '4-Suit Marriage (Roundhouse)', pts: 24, cards });
  } else {
    for (const s of marriageSuits) {
      const pairs = availMarriage[s];
      const per = s === trump ? 4 : 2;
      const kOff = s === trump ? usedTrumpK : 0;
      const qOff = s === trump ? usedTrumpQ : 0;
      items.push({
        name: `${SUIT_BY_KEY[s].name} Marriage${s === trump ? ' (Royal)' : ''}`,
        pts: per * pairs,
        cards: [...pickFrom(s, 'K', kOff, pairs), ...pickFrom(s, 'Q', qOff, pairs)],
      });
    }
  }

  // 3) Pinochle Q♠ + J♦ (double is a flat 40, never 40+8)
  const pin = Math.min(cnt.S.Q, cnt.D.J);
  if (pin >= 1) {
    const n = pin >= 2 ? 2 : 1;
    items.push({
      name: n === 2 ? 'Double Pinochle' : 'Pinochle',
      pts: n === 2 ? 40 : 4,
      cards: [...pick('S', 'Q', n), ...pick('D', 'J', n)],
    });
  }

  // Arounds
  const around = (rank, single, dbl, label) => {
    const m = Math.min(cnt.S[rank], cnt.H[rank], cnt.D[rank], cnt.C[rank]);
    if (m >= 1) {
      const n = m >= 2 ? 2 : 1;
      const cards = SUIT_KEYS.flatMap((s) => pick(s, rank, n));
      items.push({ name: n === 2 ? `Double ${label} (${dbl})` : `${label} Around`, pts: n === 2 ? dbl : single, cards });
    }
  };
  around('A', 10, 100, 'Aces');
  around('K', 8, 80, 'Kings');
  around('Q', 6, 60, 'Queens');
  around('J', 4, 40, 'Jacks');

  const total = items.reduce((s, i) => s + i.pts, 0);
  const seen = new Set();
  const allCards = [];
  for (const it of items) {
    for (const c of it.cards) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        allCards.push(c);
      }
    }
  }
  return { items, total, allCards };
}

// Defender Aces Around detection
export function acesAround(hand) {
  const cnt = { S: 0, H: 0, D: 0, C: 0 };
  for (const c of hand) if (c.rank === 'A') cnt[c.suit]++;
  const m = Math.min(cnt.S, cnt.H, cnt.D, cnt.C);
  if (m >= 2) return { type: 'double', pts: 100, label: '1000 Aces (Double)' };
  if (m >= 1) return { type: 'single', pts: 10, label: 'Aces Around' };
  return null;
}

export function suitsWithMarriage(hand) {
  const cnt = counts(hand);
  return SUIT_KEYS.filter((s) => cnt[s].K > 0 && cnt[s].Q > 0);
}
