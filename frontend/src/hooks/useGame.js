import { useReducer, useEffect, useRef } from 'react';
import { reducer, initState } from '../game/reducer';
import { saveGame } from '../game/storage';
import { SEATS, SPEED } from '../game/constants';
import { evaluateBid, chooseTrump, chooseDiscards, shouldGoDouble, laydownChallenge, aiPlay } from '../game/ai';
import { SoundEngine } from '../audio/sfx';

function aiBidAction(s, seat) {
  const { maxBid } = evaluateBid(s.hands[seat], s.settings.bidBase);
  const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
  if (maxBid >= nextVal) return { type: 'PLACE_BID', seat };
  return { type: 'PASS', seat };
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
      if (s.trickPending) {
        return setTimeout(() => dispatch({ type: 'RESOLVE_TRICK' }), d.trick);
      }
      if (s.turn && s.turn !== 'P') {
        return setTimeout(() => {
          const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump);
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

  useEffect(() => {
    saveGame({ bankrolls: state.bankrolls, settings: state.settings, dealer: state.dealer });
  }, [state.bankrolls, state.settings, state.dealer]);

  useEffect(() => {
    soundRef.current.setEnabled(state.settings.sound);
  }, [state.settings.sound]);

  // Settlement sound (once on entering settlement)
  useEffect(() => {
    if (state.phase === 'settlement' && prevPhase.current !== 'settlement') {
      const snd = soundRef.current;
      if (state.result === 'busted') snd.busted();
      else if (state.settlement && state.settlement.transfers.some((t) => t.to === 'P')) snd.win();
      else snd.lose();
    }
    prevPhase.current = state.phase;
  }, [state.phase, state.result, state.settlement]);

  useEffect(() => {
    const id = drive(state, dispatch, soundRef.current);
    return () => id && clearTimeout(id);
  }, [state]);

  const act = (action) => {
    const snd = soundRef.current;
    if (action.type === 'START_ROUND' || action.type === 'NEXT_HAND') snd.ensure();
    if (action.type === 'PLACE_BID') snd.chip();
    else if (action.type === 'PLAY_CARD') snd.play();
    else if (action.type === 'DECLARE_TRUMP') snd.trump();
    dispatch(action);
  };

  return { state, act, sound: soundRef.current };
}
