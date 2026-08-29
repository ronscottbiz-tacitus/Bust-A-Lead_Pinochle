import { reducer, initState } from '../reducer';
import { SEATS } from '../constants';
import {
  evaluateBid,
  chooseTrump,
  chooseDiscards,
  shouldGoDouble,
  laydownChallenge,
  aiPlay,
} from '../ai';

function nextAction(s) {
  switch (s.phase) {
    case 'dealing':
      return { type: 'DEAL_DONE' };
    case 'auction': {
      if (!s.currentBidder) return null;
      const { maxBid } = evaluateBid(s.hands[s.currentBidder], s.settings.bidBase, s.settings.difficulty);
      const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
      return maxBid >= nextVal ? { type: 'PLACE_BID', seat: s.currentBidder } : { type: 'PASS', seat: s.currentBidder };
    }
    case 'trump': {
      const suit = chooseTrump(s.hands[s.bidWinner]);
      return suit ? { type: 'DECLARE_TRUMP', suit } : { type: 'SOFT_SET' };
    }
    case 'discard': {
      const discards = chooseDiscards(s.hands[s.bidWinner], s.trump);
      const goingDouble = shouldGoDouble(s.hands[s.bidWinner], s.trump);
      return { type: 'AI_CONFIRM_DISCARD', discards, goingDouble };
    }
    case 'laydown': {
      const defs = SEATS.filter((x) => x !== s.bidWinner);
      const pending = defs.filter((x) => s.laydownResp[x] == null);
      if (pending.length) {
        const seat = pending[0];
        return { type: 'LAYDOWN_RESPONSE', seat, challenge: laydownChallenge(s.hands[seat], s.trump) };
      }
      return null;
    }
    case 'play': {
      if (s.bidderAcesPending) return { type: 'DECLARE_BIDDER_ACES' };
      if (s.humanAcesPending) return { type: 'DECLARE_ACES', seat: 'P' };
      if (!s.aiConcedeChecked && s.bidWinner !== 'P' && s.trickNo === 1 && s.trick.length === 0 && s.turn === s.bidWinner) {
        return { type: 'AI_CONCEDE_CHECKED' };
      }
      if (s.trickPending) return { type: 'RESOLVE_TRICK' };
      if (s.turn) {
        const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner, s.signals?.[s.turn], s.settings.difficulty, s.playedIds);
        return { type: 'PLAY_CARD', seat: s.turn, card };
      }
      return null;
    }
    default:
      return null;
  }
}

function playHand(stakesBase) {
  let s = initState();
  s.settings.stakesBase = stakesBase;
  s = reducer(s, { type: 'START_ROUND' });
  let guard = 0;
  while (s.phase !== 'settlement' && guard < 5000) {
    const a = nextAction(s);
    if (!a) break;
    s = reducer(s, a);
    guard += 1;
  }
  return s;
}

// Player-to-player payout rules: no central pot. Each transfer is a direct seat->seat
// amount equal to the active stake (x multiplier), doubled for hard sets / reneges.
test('settlement always pays player-to-player at the correct stake amounts', () => {
  const stakeLevels = [1, 2, 5];
  let seenMade = 0;
  let seenSet = 0;
  for (let i = 0; i < 240; i++) {
    const s = playHand(stakeLevels[i % 3]);
    if (s.phase !== 'settlement') continue;
    const r = s.settlement;
    const stakes = s.settings.stakesBase;
    const mult = r.mult;
    // No self-transfers; every transfer moves a positive amount between two distinct seats.
    r.transfers.forEach((t) => {
      expect(t.from).not.toBe(t.to);
      expect(t.amount).toBeGreaterThan(0);
    });

    if (s.result === 'busted') {
      // Offender pays DOUBLE the stake to each of the two opponents.
      expect(r.transfers).toHaveLength(2);
      r.transfers.forEach((t) => {
        expect(t.from).toBe(s.busted.seat);
        expect(t.amount).toBe(2 * mult * stakes);
      });
      seenSet += 1;
    } else if (s.result === 'made' || s.laydownUnchallenged) {
      // Each opponent pays the bidder ONE stake.
      r.transfers.forEach((t) => {
        expect(t.to).toBe(s.bidWinner);
        expect(t.amount).toBe(mult * stakes);
      });
      seenMade += 1;
    } else if (s.result === 'soft') {
      // Bidder pays each opponent ONE stake.
      r.transfers.forEach((t) => {
        expect(t.from).toBe(s.bidWinner);
        expect(t.amount).toBe(mult * stakes);
      });
      seenSet += 1;
    } else if (s.result === 'hard') {
      // Bidder pays each opponent DOUBLE the stake.
      r.transfers.forEach((t) => {
        expect(t.from).toBe(s.bidWinner);
        expect(t.amount).toBe(2 * mult * stakes);
      });
      seenSet += 1;
    }
  }
  expect(seenMade + seenSet).toBeGreaterThan(0);
});
