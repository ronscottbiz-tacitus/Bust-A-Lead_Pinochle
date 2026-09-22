import { SEATS, nextSeat, leftOf, isCounter, startingBankrolls } from './constants';
import { dealDeck } from './deck';
import { computeMeld, acesAround, suitsWithMarriage } from './meld';
import { legalPlays, currentWinnerIndex, trickBooks, renegeReason } from './trick';
import { saveTarget, laydownSafe } from './scoring';
import { loadSave } from './storage';

const clone = (o) =>
  typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));

function allCardsFrom(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) for (const c of it.cards) if (!seen.has(c.id)) { seen.add(c.id); out.push(c); }
  return out;
}

const EMPTY_STATS = {
  handsPlayed: 0,
  handsMade: 0,
  softSets: 0,
  hardSets: 0,
  biggestPot: 0,
  winStreak: 0,
  bestStreak: 0,
  net: { W: 0, E: 0, P: 0 },
};

function emptyRound() {
  return {
    hands: { W: [], E: [], P: [] },
    kitty: [],
    packets: [],
    kittyCollected: false,
    trump: null,
    availableTrumps: [],
    bid: null,
    highBidder: null,
    currentBidder: null,
    passed: { W: false, E: false, P: false },
    bidWinner: null,
    kittyExposed: false,
    discards: [],
    buriedBooks: 0,
    goingDouble: false,
    laydown: false,
    laydownResp: {},
    laydownOutcome: null,
    laydownChallenged: false,
    laydownUnchallenged: false,
    bidderExposed: false,
    meld: { W: null, E: null, P: null },
    defenderAces: { W: null, E: null, P: null },
    humanAcesPending: false,
    trick: [],
    leader: null,
    turn: null,
    trickNo: 0,
    books: { W: 0, E: 0, P: 0 },
    trickPending: false,
    lastTrick: null,
    lastTrickWinner: null,
    bidLog: [],
    signals: { W: null, E: null, P: null },
    playedIds: [],
    completedBooks: [],
    boardSet: false,
    busted: null,
    result: null,
    settlement: null,
    gameOver: false,
    renegeSlipped: 0,
    bidderAcesItem: null,
    bidderAcesPending: false,
    bidderAcesDeclared: false,
    bidderAcesForfeited: false,
    trickReneges: [],
    renegeCall: null,
    conceded: false,
    playLog: [],
    aiConcedeChecked: false,
    playedOut: false,
    thrownIn: false,
  };
}

export function initState() {
  const saved = loadSave();
  return {
    phase: 'config',
    settings: {
      bidBase: 60,
      sortMode: 'suit',
      animSpeed: 'normal',
      sound: true,
      stakesBase: 1,
      difficulty: 'normal',
      muteTaunts: false,
      convictBoldness: 'balanced',
      convictRenege: 'low',
      tutorialHints: false,
      playerChar: 'g2',
      oppW: null,
      oppE: null,
      skill: 'alight',
      ...(saved?.settings || {}),
    },
    bankrolls: saved?.bankrolls || startingBankrolls(),
    dealer: saved?.dealer || 'P',
    stats: { ...clone(EMPTY_STATS), ...(saved?.stats || {}) },
    ...emptyRound(),
  };
}

function dealRound(s) {
  Object.assign(s, emptyRound());
  const { hands, kitty, packets } = dealDeck();
  s.hands = hands;
  s.kitty = kitty;
  s.packets = packets;
  s.phase = 'dealing';
  return s;
}

function nextActiveBidder(passed, from) {
  let seat = from;
  for (let i = 0; i < 3; i++) {
    seat = nextSeat(seat);
    if (!passed[seat]) return seat;
  }
  return from;
}

function beginTrump(s, winner, bidValue) {
  s.bidWinner = winner;
  s.bid = bidValue;
  s.currentBidder = null;
  s.availableTrumps = suitsWithMarriage(s.hands[winner]);
  s.phase = 'trump';
  return s;
}

function afterBidChange(s) {
  const active = SEATS.filter((x) => !s.passed[x]);
  if (s.bid != null && active.length === 1) return beginTrump(s, active[0], s.bid);
  if (s.bid == null && active.length === 1) return beginTrump(s, active[0], s.settings.bidBase);
  s.currentBidder = nextActiveBidder(s.passed, s.currentBidder);
  return s;
}

function finalizeDiscard(s) {
  const set = new Set(s.discards);
  const hand = s.hands[s.bidWinner];
  const buried = hand.filter((c) => set.has(c.id));
  s.buriedBooks = buried.filter(isCounter).length;
  s.hands[s.bidWinner] = hand.filter((c) => !set.has(c.id));
  s.meld[s.bidWinner] = computeMeld(s.hands[s.bidWinner], s.trump);
  // BOARD SET guardrail uses the FULL potential meld (Aces Around can still be declared).
  const meldTotal = s.meld[s.bidWinner].total;
  if (s.bid - meldTotal > 50) {
    s.boardSet = true;
    s.result = 'hard';
    return settle(s);
  }
  // Lay-Down gate: a lay-down must be provably safe on the kept hand (potential losers vs room).
  if (s.laydown) {
    const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
    if (!laydownSafe(s.hands[s.bidWinner], s.trump, bench)) s.laydown = false;
  }
  // Aces Around must be DECLARED before the bidder leads an Ace, or it is forfeited.
  const meld = s.meld[s.bidWinner];
  const acesIdx = meld.items.findIndex((i) => /^(Aces Around|(Double|Triple|Quadruple) Aces)/.test(i.name));
  if (acesIdx >= 0) {
    s.bidderAcesItem = meld.items[acesIdx];
    s.bidderAcesPending = true;
    meld.items = meld.items.filter((_, k) => k !== acesIdx);
    meld.total -= s.bidderAcesItem.pts;
    meld.allCards = allCardsFrom(meld.items);
  }
  if (s.laydown) {
    s.phase = 'laydown';
    s.laydownResp = {};
    return s;
  }
  return beginPlay(s);
}

function beginPlay(s) {
  const defs = SEATS.filter((x) => x !== s.bidWinner);
  for (const d of defs) {
    const a = acesAround(s.hands[d]);
    if (d === 'P') {
      if (a) {
        s.humanAcesPending = true;
        s.defenderAces.P = null;
      } else s.defenderAces.P = 'none';
    } else {
      s.defenderAces[d] = a ? a.type : 'none';
    }
  }
  s.phase = 'play';
  s.leader = s.bidWinner;
  s.turn = s.bidWinner;
  s.trickNo = 1;
  s.trick = [];
  s.trickPending = false;
  s.books = { W: 0, E: 0, P: 0 };
  s.trickReneges = [];
  return s;
}

function computeSettlement(s) {
  const seats = SEATS;
  const stakes = s.settings.stakesBase || 1;
  let mult = 1;
  const parts = [];
  if (s.goingDouble) {
    mult *= 2;
    parts.push('Going Double ×2');
  }
  if (s.laydownChallenged) {
    mult *= 2;
    parts.push('Lay-Down Challenged ×2');
  }
  if (s.trump === 'S') {
    mult *= 2;
    parts.push('Spades Trump ×2');
  }

  const bank = clone(s.bankrolls);
  const transfers = [];
  let label = '';
  let unit = 0;
  const bidder = s.bidWinner;
  const meldTotal = s.meld[bidder]?.total || 0;
  const bidderBooks = s.books[bidder] + s.buriedBooks;
  const benchmark = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });

  if (s.result === 'busted') {
    const off = s.busted.seat;
    const others = seats.filter((x) => x !== off);
    label = 'BUSTED A LEAD — Hard Set';
    for (const o of others) {
      const amt = 2 * mult * stakes;
      bank[off] -= amt;
      bank[o] += amt;
      transfers.push({ from: off, to: o, amount: amt });
    }
  } else {
    const defenders = seats.filter((x) => x !== bidder);
    if (s.result === 'made' || s.laydownUnchallenged) {
      unit = 1;
      label = s.laydownUnchallenged ? 'Unchallenged Lay-Down — Contract Made' : 'Contract Made';
    } else if (s.result === 'soft') {
      unit = -1;
      label = 'Soft Set (Conceded)';
    } else {
      unit = -2;
      label = s.thrownIn ? 'Threw It In — Hard Set' : 'Hard Set';
    }
    const per = unit * mult * stakes;
    for (const d of defenders) {
      bank[bidder] += per;
      bank[d] -= per;
      if (per >= 0) transfers.push({ from: d, to: bidder, amount: per });
      else transfers.push({ from: bidder, to: d, amount: -per });
    }
  }

  for (const k of seats) if (bank[k] < 0) bank[k] = 0;
  const gameOver = seats.some((k) => bank[k] <= 0);

  return {
    label,
    mult,
    multParts: parts,
    stakes,
    unit,
    benchmark,
    meldTotal,
    bid: s.bid,
    bidderBooks,
    bidder,
    result: s.result,
    transfers,
    newBankrolls: bank,
    gameOver,
    busted: s.busted,
    boardSet: !!s.boardSet,
  };
}

function updateStats(s, res) {
  const st = s.stats;
  st.handsPlayed += 1;
  if (res.result === 'made') st.handsMade += 1;
  else if (res.result === 'soft') st.softSets += 1;
  else st.hardSets += 1; // 'hard' or 'busted'
  let pNet = 0;
  for (const t of res.transfers) {
    st.net[t.to] += t.amount;
    st.net[t.from] -= t.amount;
    if (t.amount > st.biggestPot) st.biggestPot = t.amount;
    if (t.to === 'P') pNet += t.amount;
    if (t.from === 'P') pNet -= t.amount;
  }
  st.winStreak = st.winStreak || 0;
  st.bestStreak = st.bestStreak || 0;
  if (pNet > 0) {
    st.winStreak += 1;
    if (st.winStreak > st.bestStreak) st.bestStreak = st.winStreak;
  } else {
    st.winStreak = 0;
  }
}

function settle(s) {
  const res = computeSettlement(s);
  updateStats(s, res);
  s.settlement = res;
  s.bankrolls = res.newBankrolls;
  s.gameOver = res.gameOver;
  s.phase = 'settlement';
  return s;
}

function bust(s, seat, reason) {
  s.busted = { seat, reason };
  s.result = 'busted';
  return settle(s);
}

export function reducer(state, action) {
  const s = clone(state);
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      s.settings = { ...s.settings, ...action.settings };
      return s;

    case 'NEW_GAME':
      s.bankrolls = startingBankrolls();
      s.dealer = 'P';
      s.stats = clone(EMPTY_STATS);
      s.phase = 'config';
      Object.assign(s, emptyRound());
      return s;

    case 'RESET_STATS':
      s.stats = clone(EMPTY_STATS);
      return s;

    case 'RESET_TABLE':
      s.bankrolls = startingBankrolls();
      s.dealer = 'P';
      s.stats = clone(EMPTY_STATS);
      return dealRound(s);

    case 'START_ROUND':
      return dealRound(s);

    case 'DEAL_DONE':
      s.phase = 'auction';
      s.currentBidder = leftOf(s.dealer);
      s.bid = null;
      s.highBidder = null;
      s.passed = { W: false, E: false, P: false };
      return s;

    case 'PLACE_BID': {
      s.bid = s.bid == null ? s.settings.bidBase : s.bid + 5;
      s.highBidder = action.seat;
      s.bidLog.push({ seat: action.seat, text: `Bid $${s.bid}`, kind: 'bid' });
      return afterBidChange(s);
    }
    case 'PASS':
      s.passed[action.seat] = true;
      s.bidLog.push({ seat: action.seat, text: 'Pass', kind: 'pass' });
      return afterBidChange(s);

    case 'DECLARE_TRUMP':
      s.trump = action.suit;
      s.hands[s.bidWinner] = [...s.hands[s.bidWinner], ...s.kitty];
      s.kittyCollected = true;
      s.discards = [];
      s.phase = 'discard';
      return s;

    case 'SOFT_SET':
      s.result = 'soft';
      return settle(s);

    case 'TOGGLE_EXPOSE':
      s.kittyExposed = !s.kittyExposed;
      return s;

    case 'TOGGLE_DISCARD': {
      const id = action.id;
      if (s.discards.includes(id)) s.discards = s.discards.filter((x) => x !== id);
      else if (s.discards.length < 5) s.discards = [...s.discards, id];
      return s;
    }
    case 'TOGGLE_GOING_DOUBLE':
      s.goingDouble = !s.goingDouble;
      return s;
    case 'TOGGLE_LAYDOWN':
      s.laydown = !s.laydown;
      return s;

    case 'CONFIRM_DISCARD':
      if (s.discards.length !== 5) return state;
      return finalizeDiscard(s);

    case 'AI_CONFIRM_DISCARD':
      s.discards = action.discards;
      s.goingDouble = action.goingDouble;
      return finalizeDiscard(s);

    case 'CONCEDE_PREPLAY':
      s.result = 'soft';
      s.conceded = true;
      return settle(s);

    // "Throw It In" — the human bidder surrenders mid-hand and eats a full Hard Set.
    case 'THROW_IN':
      if (s.phase !== 'play' || s.bidWinner !== 'P') return state;
      s.result = 'hard';
      s.conceded = true;
      s.thrownIn = true;
      s.trickPending = false;
      s.turn = null;
      return settle(s);

    case 'LAYDOWN_RESPONSE': {
      s.laydownResp = { ...s.laydownResp, [action.seat]: action.challenge };
      const defs = SEATS.filter((x) => x !== s.bidWinner);
      if (defs.every((d) => s.laydownResp[d] != null)) {
        const challenged = defs.some((d) => s.laydownResp[d] === true);
        s.laydownOutcome = {
          id: Date.now(),
          result: challenged ? 'challenged' : 'conceded',
          challengers: defs.filter((d) => s.laydownResp[d] === true),
          responses: { ...s.laydownResp },
        };
        if (challenged) {
          s.laydownChallenged = true;
          s.bidderExposed = true;
          return beginPlay(s);
        }
        s.laydownUnchallenged = true;
        s.result = 'made';
        return settle(s);
      }
      return s;
    }

    case 'DECLARE_ACES': {
      const a = acesAround(s.hands[action.seat]);
      s.defenderAces[action.seat] = a ? a.type : 'none';
      if (action.seat === 'P') s.humanAcesPending = false;
      return s;
    }
    case 'NO_ACES':
      s.defenderAces[action.seat] = 'none';
      if (action.seat === 'P') s.humanAcesPending = false;
      return s;

    case 'DECLARE_BIDDER_ACES': {
      if (s.bidderAcesPending && s.bidderAcesItem) {
        const meld = s.meld[s.bidWinner];
        meld.items = [...meld.items, s.bidderAcesItem];
        meld.total += s.bidderAcesItem.pts;
        meld.allCards = allCardsFrom(meld.items);
        s.bidderAcesDeclared = true;
        s.bidderAcesPending = false;
      }
      return s;
    }

    case 'CALL_RENEGE': {
      if (s.phase !== 'play') return state;
      const { accuseSeat, book } = action;
      // Yard Court audit: accuse a specific opponent for a specific book.
      if (accuseSeat != null && book != null) {
        const entry = (s.playLog || []).find((e) => e.seat === accuseSeat && e.book === book);
        if (entry && !entry.legal) {
          s.renegeCall = { result: 'confirmed', seat: accuseSeat, book, reason: entry.reason };
          return bust(s, accuseSeat, `RENEGE CONFIRMED (Book ${book}) — ${entry.reason}`);
        }
        // Undeclared Aces: caught a defender who held Aces Around but never declared.
        if (s.defenderAces[accuseSeat] === 'none') {
          const first = (s.playLog || []).find((e) => e.seat === accuseSeat);
          if (first && acesAround(first.handBefore)) {
            s.renegeCall = { result: 'confirmed', seat: accuseSeat, book, reason: 'Undeclared Aces Around' };
            return bust(s, accuseSeat, `RENEGE CONFIRMED (Book ${book}) — Undeclared Aces Around`);
          }
        }
        s.renegeCall = { result: 'false', seat: 'P', book };
        return bust(s, 'P', 'FALSE ACCUSATION — the play was legal');
      }
      // Legacy quick-call against the current trick.
      const reneger = (s.trickReneges || []).find((r) => r.seat !== 'P');
      if (reneger) {
        s.renegeCall = { result: 'confirmed', seat: reneger.seat };
        return bust(s, reneger.seat, 'RENEGE CONFIRMED — illegal card exposed');
      }
      s.renegeCall = { result: 'false', seat: 'P' };
      return bust(s, 'P', 'FALSE ACCUSATION — the play was legal');
    }

    case 'AI_CONCEDE_CHECKED':
      s.aiConcedeChecked = true;
      return s;

    case 'PLAY_CARD': {
      const { seat, card } = action;
      // Hard guard: only the seat whose turn it is may play, once, from cards it actually holds.
      // Blocks stale double-taps that would otherwise be judged against the wrong trick state.
      if (s.phase !== 'play' || s.trickPending || s.turn !== seat) return state;
      if (!s.hands[seat].some((c) => c.id === card.id)) return state;
      if (seat === 'P' && s.humanAcesPending)
        return bust(s, 'P', 'Failed to declare Aces before playing card 1');
      // Bidder forfeits undeclared Aces Around the instant they LEAD an Ace.
      if (seat === s.bidWinner && s.bidderAcesPending && s.trick.length === 0 && card.rank === 'A') {
        s.bidderAcesForfeited = true;
        s.bidderAcesPending = false;
      }
      const legal = legalPlays(s.hands[seat], s.trick, s.trump);
      const isLegal = legal.some((c) => c.id === card.id);
      if (!isLegal) {
        const hard = s.settings.difficulty === 'hard';
        const why = renegeReason(s.hands[seat], s.trick, s.trump, card) || 'Illegal play';
        if (!hard) return bust(s, seat, `Reneged — ${why}`);
        if (seat === 'P') {
          // Player renege: the yard inspects (~95% catch).
          if (Math.random() < 0.95)
            return bust(s, seat, `BUS' A LEAD VIOLATION (RENEGE) — ${why}`);
          s.renegeSlipped = (s.renegeSlipped || 0) + 1;
        } else {
          // AI renege in Convict: the illegal card stands unless the human Calls Renege.
          s.trickReneges = [...(s.trickReneges || []), { seat, cardId: card.id }];
        }
      }
      const wasLeading = s.trick.length === 0;
      const winnerBefore = s.trick.length ? s.trick[currentWinnerIndex(s.trick, s.trump)].seat : null;
      // Deep audit snapshot: the exact hand held at the moment of this play.
      s.playLog.push({
        book: s.trickNo,
        playIndex: s.trick.length,
        seat,
        card: { ...card },
        leadSeat: s.trick.length ? s.trick[0].seat : seat,
        leadCard: s.trick.length ? { ...s.trick[0].card } : { ...card },
        handBefore: s.hands[seat].map((c) => ({ ...c })),
        trump: s.trump,
        legal: isLegal,
        reason: isLegal ? null : renegeReason(s.hands[seat], s.trick, s.trump, card),
      });
      s.hands[seat] = s.hands[seat].filter((c) => c.id !== card.id);
      s.trick = [...s.trick, { seat, card }];
      s.playedIds.push(card.id);
      // Consume a come-back signal when this seat leads.
      if (wasLeading && s.signals[seat]) s.signals[seat] = null;
      // Record a come-back signal: a defender throws a high card (A/J) onto their partner's winning book.
      if (!wasLeading) {
        const isDef = seat !== s.bidWinner;
        const partnerWinning = isDef && winnerBefore && winnerBefore !== seat && winnerBefore !== s.bidWinner;
        const thisWins = currentWinnerIndex(s.trick, s.trump) === s.trick.length - 1;
        if (partnerWinning && !thisWins && (card.rank === 'A' || card.rank === 'J')) {
          s.signals[winnerBefore] = card.suit;
        }
      }
      if (s.trick.length < 3) s.turn = nextSeat(seat);
      else s.trickPending = true;
      return s;
    }

    case 'RESOLVE_TRICK': {
      const wi = currentWinnerIndex(s.trick, s.trump);
      const winner = s.trick[wi].seat;
      let pts = trickBooks(s.trick);
      if (s.trickNo === 25) pts += 2;
      s.books[winner] += pts;
      s.lastTrick = s.trick;
      s.lastTrickWinner = winner;
      s.completedBooks.push({
        book: s.trickNo,
        leader: s.leader,
        winner,
        pts,
        plays: s.trick.map((p) => ({ seat: p.seat, card: p.card })),
      });
      if (s.trickNo >= 25) {
        const meldTotal = s.meld[s.bidWinner]?.total || 0;
        const bidderBooks = s.books[s.bidWinner] + s.buriedBooks;
        const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
        s.playedOut = true; // hand ran to the final trick — a hard set here is a real Hard Set
        s.result = bidderBooks >= bench ? 'made' : 'hard';
        return settle(s);
      }
      s.trickNo += 1;
      s.leader = winner;
      s.turn = winner;
      s.trick = [];
      s.trickPending = false;
      s.trickReneges = [];
      return s;
    }

    case 'NEXT_HAND':
      s.dealer = nextSeat(s.dealer);
      return dealRound(s);

    default:
      return state;
  }
}
