import { useReducer, useEffect, useRef, useState } from 'react';
import { reducer, initState } from '../game/reducer';
import { saveGame } from '../game/storage';
import { SEATS, SPEED } from '../game/constants';
import { evaluateBid, chooseTrump, chooseDiscards, shouldGoDouble, laydownChallenge, aiPlay, aiConcede } from '../game/ai';
import { saveTarget } from '../game/scoring';
import { SoundEngine } from '../audio/sfx';

function aiBidAction(s, seat) {
  const { maxBid } = evaluateBid(s.hands[seat], s.settings.bidBase, s.settings.difficulty);
  const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
  if (maxBid >= nextVal) return { type: 'PLACE_BID', seat };
  return { type: 'PASS', seat };
}

// Maps a settlement state to the cutscene { key, data } that should play (or null).
// Priority: (1) early throw-in / concession, (2) renege & violation penalties,
// (3) a Hard Set ONLY when the hand played out to the final trick.
function settlementCutscene(s) {
  // 1) Fold / concede / soft set / board set (thrown in before completing the hand).
  const isConcession = s.result === 'soft' || s.conceded || (s.result === 'hard' && s.boardSet);
  if (isConcession && s.result !== 'busted') return { key: 'concession' };

  // 2) Renege / Bus'-a-Lead violation penalties.
  if (s.result === 'busted') {
    const reason = s.busted?.reason || '';
    if (/FALSE ACCUSATION/i.test(reason)) return { key: 'trashtalk' };
    if (/RENEGE|VIOLATION/i.test(reason)) {
      const rc = s.renegeCall;
      let data = null;
      if (rc && rc.seat && rc.book != null) {
        const entry = (s.playLog || []).find((e) => e.seat === rc.seat && e.book === rc.book);
        if (entry) data = { card: entry.card, leadCard: entry.leadCard, seat: entry.seat, reason: rc.reason || entry.reason, book: entry.book };
      }
      return { key: 'renege', data };
    }
    return { key: 'hardset' };
  }

  // 3) Hard Set only after a fully played-out hand fails the contract floor.
  if (s.result === 'hard' && s.playedOut) return { key: 'hardset' };
  // Any remaining early hard result is treated as a concession (safety net).
  if (s.result === 'hard') return { key: 'concession' };
  return null;
}

// Returns a timeout id (or null). Drives AI turns and timed transitions.
function drive(s, dispatch, sound) {
  const d = SPEED[s.settings.animSpeed] || SPEED.normal;
  switch (s.phase) {
    case 'dealing':
      sound.deal();
      return setTimeout(() => dispatch({ type: 'DEAL_DONE' }), d.deal);

    case 'auction':
      if (s.currentBidder && s.currentBidder !== 'P') {
        return setTimeout(() => {
          const act = aiBidAction(s, s.currentBidder);
          if (act.type === 'PLACE_BID') sound.chip();
          dispatch(act);
        }, d.think);
      }
      return null;

    case 'trump':
      if (s.bidWinner !== 'P') {
        return setTimeout(() => {
          const suit = chooseTrump(s.hands[s.bidWinner]);
          if (!suit) dispatch({ type: 'SOFT_SET' });
          else {
            sound.trump();
            dispatch({ type: 'DECLARE_TRUMP', suit });
          }
        }, d.think);
      }
      if (s.availableTrumps && s.availableTrumps.length === 0) {
        return setTimeout(() => dispatch({ type: 'SOFT_SET' }), d.think);
      }
      return null;

    case 'discard':
      if (s.bidWinner !== 'P') {
        return setTimeout(() => {
          const discards = chooseDiscards(s.hands[s.bidWinner], s.trump);
          const goingDouble = shouldGoDouble(s.hands[s.bidWinner], s.trump);
          dispatch({ type: 'AI_CONFIRM_DISCARD', discards, goingDouble });
        }, d.think * 1.5);
      }
      return null;

    case 'laydown': {
      const defs = SEATS.filter((x) => x !== s.bidWinner);
      const pending = defs.filter((x) => x !== 'P' && s.laydownResp[x] == null);
      if (pending.length) {
        const seat = pending[0];
        return setTimeout(() => {
          const challenge = laydownChallenge(s.hands[seat], s.trump);
          dispatch({ type: 'LAYDOWN_RESPONSE', seat, challenge });
        }, d.think);
      }
      return null;
    }

    case 'play':
      if (s.bidderAcesPending && s.bidWinner && s.bidWinner !== 'P') {
        return setTimeout(() => dispatch({ type: 'DECLARE_BIDDER_ACES' }), Math.max(200, d.think / 2));
      }
      // Personality-driven AI concession audit before leading Book 1.
      if (
        s.bidWinner && s.bidWinner !== 'P' && !s.aiConcedeChecked && !s.bidderAcesPending &&
        s.trickNo === 1 && s.trick.length === 0 && s.turn === s.bidWinner
      ) {
        return setTimeout(() => {
          const meldTotal = s.meld[s.bidWinner]?.total || 0;
          const bench = saveTarget({ bid: s.bid, meldTotal, goingDouble: s.goingDouble });
          if (aiConcede(s.bidWinner, s.hands[s.bidWinner], s.trump, bench)) {
            dispatch({ type: 'CONCEDE_PREPLAY', seat: s.bidWinner });
          } else {
            dispatch({ type: 'AI_CONCEDE_CHECKED' });
          }
        }, d.think);
      }
      if (s.trickPending) {
        return setTimeout(() => dispatch({ type: 'RESOLVE_TRICK' }), d.trick);
      }
      if (s.turn && s.turn !== 'P') {
        return setTimeout(() => {
          const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner, s.signals?.[s.turn], s.settings.difficulty, s.playedIds);
          sound.play();
          dispatch({ type: 'PLAY_CARD', seat: s.turn, card });
        }, d.think);
      }
      return null;

    default:
      return null;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const soundRef = useRef(null);
  if (!soundRef.current) soundRef.current = new SoundEngine();
  const prevPhase = useRef(state.phase);
  const [cutscene, setCutscene] = useState(null);
  const [paused, setPaused] = useState(false);
  const trashRef = useRef(state.completedBooks.length);

  useEffect(() => {
    saveGame({ bankrolls: state.bankrolls, settings: state.settings, dealer: state.dealer, stats: state.stats });
  }, [state.bankrolls, state.settings, state.dealer, state.stats]);

  useEffect(() => {
    soundRef.current.setEnabled(state.settings.sound);
  }, [state.settings.sound]);

  // Settlement transition: trigger an event cutscene WITH its accompanying SFX cue.
  useEffect(() => {
    if (state.phase === 'settlement' && prevPhase.current !== 'settlement') {
      const cs = settlementCutscene(state);
      const snd = soundRef.current;
      if (cs) {
        setCutscene({ key: cs.key, blocking: true, data: cs.data });
        if (cs.key === 'renege' || cs.key === 'trashtalk') snd.renege();
        else if (cs.key === 'hardset') snd.busted();
        else if (cs.key === 'concession') snd.play();
      } else if (state.result === 'busted') snd.busted();
      else if (state.settlement && state.settlement.transfers.some((t) => t.to === 'P')) snd.win();
      else snd.lose();
    }
    prevPhase.current = state.phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.result, state.settlement, state.busted]);

  // Random Convict trash-talk cutscene when an AI takes a book mid-hand.
  useEffect(() => {
    if (state.phase !== 'play') {
      trashRef.current = state.completedBooks.length;
      return;
    }
    if (state.completedBooks.length > trashRef.current) {
      trashRef.current = state.completedBooks.length;
      const w = state.lastTrickWinner;
      if (!cutscene && (w === 'W' || w === 'E') && Math.random() < 0.12) {
        setCutscene({ key: 'trashtalk', blocking: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.completedBooks.length, state.phase]);

  // Drive the game loop, but PAUSE it while a cutscene plays or the audit is open.
  useEffect(() => {
    if (cutscene?.blocking || paused) return undefined;
    const id = drive(state, dispatch, soundRef.current);
    return () => id && clearTimeout(id);
  }, [state, cutscene, paused]);

  const clearCutscene = () => setCutscene(null);

  const act = (action) => {
    const snd = soundRef.current;
    if (action.type === 'START_ROUND' || action.type === 'NEXT_HAND' || action.type === 'RESET_TABLE') snd.ensure();
    if (action.type === 'PLACE_BID') snd.chip();
    else if (action.type === 'PLAY_CARD') snd.play();
    else if (action.type === 'DECLARE_TRUMP') snd.trump();
    dispatch(action);
  };

  return { state, act, sound: soundRef.current, cutscene, clearCutscene, setPaused };
}
