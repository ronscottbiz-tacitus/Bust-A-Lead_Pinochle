import { SUIT_KEYS, SUIT_BY_KEY } from './constants';

function counts(hand) {
  const cnt = {};
  for (const s of SUIT_KEYS) cnt[s] = { A: 0, '10': 0, K: 0, Q: 0, J: 0 };
  for (const c of hand) cnt[c.suit][c.rank]++;
  return cnt;
}

// Compute bidder meld board for display.
export function computeMeld(hand, trump) {
  const cnt = counts(hand);
  const items = [];

  // Marriages
  const marriageSuits = SUIT_KEYS.filter((s) => cnt[s].K > 0 && cnt[s].Q > 0);
  if (marriageSuits.length === 4) {
    items.push({ name: '4-Suit Marriage (Roundhouse)', pts: 24 });
  } else {
    for (const s of marriageSuits) {
      const pairs = Math.min(cnt[s].K, cnt[s].Q);
      const per = s === trump ? 4 : 2;
      items.push({
        name: `${SUIT_BY_KEY[s].name} Marriage${s === trump ? ' (Royal)' : ''}`,
        pts: per * pairs,
      });
    }
  }

  // Trump run: A,10,K,Q,J in trump
  if (trump) {
    const t = cnt[trump];
    const runs = Math.min(t.A, t['10'], t.K, t.Q, t.J);
    if (runs >= 2) items.push({ name: 'Double Trump Run', pts: 150 });
    else if (runs === 1) items.push({ name: 'Trump Run', pts: 15 });
  }

  // Pinochle Q♠ + J♦
  const pin = Math.min(cnt.S.Q, cnt.D.J);
  if (pin >= 2) items.push({ name: 'Double Pinochle', pts: 40 });
  else if (pin === 1) items.push({ name: 'Pinochle', pts: 4 });

  // Arounds
  const around = (rank, single, dbl, label) => {
    const m = Math.min(cnt.S[rank], cnt.H[rank], cnt.D[rank], cnt.C[rank]);
    if (m >= 2) items.push({ name: `Double ${label} (${dbl})`, pts: dbl });
    else if (m === 1) items.push({ name: `${label} Around`, pts: single });
  };
  around('A', 10, 100, 'Aces');
  around('K', 8, 80, 'Kings');
  around('Q', 6, 60, 'Queens');
  around('J', 4, 40, 'Jacks');

  const total = items.reduce((s, i) => s + i.pts, 0);
  return { items, total };
}

// Defender Aces Around detection
export function acesAround(hand) {
  const cnt = { S: 0, H: 0, D: 0, C: 0 };
  for (const c of hand) if (c.rank === 'A') cnt[c.suit]++;
  const m = Math.min(cnt.S, cnt.H, cnt.D, cnt.C);
  if (m >= 2) return { type: 'double', pts: 100, label: '1000 Aces (Double)' };
  if (m === 1) return { type: 'single', pts: 10, label: 'Aces Around' };
  return null;
}

export function suitsWithMarriage(hand) {
  const cnt = counts(hand);
  return SUIT_KEYS.filter((s) => cnt[s].K > 0 && cnt[s].Q > 0);
}
