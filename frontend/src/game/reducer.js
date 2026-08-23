import { SEATS, nextSeat, leftOf, isCounter } from './constants';
import { dealDeck } from './deck';
import { computeMeld, acesAround, suitsWithMarriage } from './meld';
import { legalPlays, currentWinnerIndex, trickBooks } from './trick';
import { loadSave } from './storage';

const clone = (o) =>
  typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));

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
    busted: null,
    result: null,
    settlement: null,
    gameOver: false,
  };
}

export function initState() {
  const saved = loadSave();
  return {
    phase: 'config',
    settings: saved?.settings || { bidBase: 60, sortMode: 'suit', animSpeed: 'normal', sound: true },
    bankrolls: saved?.bankrolls || { W: 100, E: 100, P: 100 },
    dealer: saved?.dealer || 'P',
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
  return s;
}

function computeSettlement(s) {
  const seats = SEATS;
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
  const bidderBooks = s.books[bidder] + s.buriedBooks;
  const benchmark = s.goingDouble ? 31 : 20;

  if (s.result === 'busted') {
    const off = s.busted.seat;
    const others = seats.filter((x) => x !== off);
    label = 'BUSTED A LEAD — Hard Set';
    for (const o of others) {
      const amt = 2 * mult;
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
      label = 'Hard Set';
    }
    const per = unit * mult;
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
    unit,
    benchmark,
    bidderBooks,
    bidder,
    result: s.result,
    transfers,
    newBankrolls: bank,
    gameOver,
    busted: s.busted,
  };
}

function settle(s) {
  const res = computeSettlement(s);
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
      s.bankrolls = { W: 100, E: 100, P: 100 };
      s.dealer = 'P';
      s.phase = 'config';
      Object.assign(s, emptyRound());
      return s;

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
      return afterBidChange(s);
    }
    case 'PASS':
      s.passed[action.seat] = true;
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
      return settle(s);

    case 'LAYDOWN_RESPONSE': {
      s.laydownResp = { ...s.laydownResp, [action.seat]: action.challenge };
      const defs = SEATS.filter((x) => x !== s.bidWinner);
      if (defs.every((d) => s.laydownResp[d] != null)) {
        const challenged = defs.some((d) => s.laydownResp[d] === true);
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

    case 'PLAY_CARD': {
      const { seat, card } = action;
      if (seat === 'P' && s.humanAcesPending)
        return bust(s, 'P', 'Failed to declare Aces before playing card 1');
      const legal = legalPlays(s.hands[seat], s.trick, s.trump);
      if (!legal.some((c) => c.id === card.id)) return bust(s, seat, 'Reneged — illegal card played');
      s.hands[seat] = s.hands[seat].filter((c) => c.id !== card.id);
      s.trick = [...s.trick, { seat, card }];
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
      if (s.trickNo >= 25) {
        const bidderBooks = s.books[s.bidWinner] + s.buriedBooks;
        const bench = s.goingDouble ? 31 : 20;
        s.result = bidderBooks >= bench ? 'made' : 'hard';
        return settle(s);
      }
      s.trickNo += 1;
      s.leader = winner;
      s.turn = winner;
      s.trick = [];
      s.trickPending = false;
      return s;
    }

    case 'NEXT_HAND':
      s.dealer = nextSeat(s.dealer);
      return dealRound(s);

    default:
      return state;
  }
}
