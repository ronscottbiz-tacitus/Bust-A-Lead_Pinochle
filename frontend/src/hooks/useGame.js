import { useReducer, useEffect, useRef, useState } from 'react';
import { reducer, initState } from '../game/reducer';
import { saveGame } from '../game/storage';
import { SEATS, SPEED, COUNTER_RANKS } from '../game/constants';
import { evaluateBid, chooseTrump, chooseDiscards, shouldGoDouble, laydownChallenge, aiPlay, aiConcede } from '../game/ai';
import { saveTarget } from '../game/scoring';
import { SoundEngine } from '../audio/sfx';

// Convict-tuning renege probabilities per play (settings.convictRenege).
const RENEGE_RATE = { off: 0, low: 0.02, high: 0.06 };

function aiBidAction(s, seat) {
  const { maxBid } = evaluateBid(s.hands[seat], s.settings.bidBase, s.settings.difficulty, s.settings.convictBoldness);
  const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
  if (maxBid >= nextVal) return { type: 'PLACE_BID', seat };
  return { type: 'PASS', seat };
}

// Maps a settlement state to the cutscene { key, data } that should play (or null).
// Priority: elimination > concession > renege/violation > win/hard-set milestones.
export function settlementCutscene(s) {
  // 0) Match over — the definitive full-screen finale is always The Get-2 portal.
  if (s.gameOver) {
    return { key: 'portal' };
  }

  // 1) Fold / concede / soft set / board set (thrown in before completing the hand).
  const isConcession = s.result === 'soft' || s.conceded || (s.result === 'hard' && s.boardSet);
  if (isConcession && s.result !== 'busted') return { key: 'concession' };

  // 2) Renege / Bus'-a-Lead violation penalties.
  if (s.result === 'busted') {
    const reason = s.busted?.reason || '';
    if (/FALSE ACCUSATION/i.test(reason)) return { key: 'falseaccuse', data: { speaker: 'E' } };
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

  // 3) G2 makes the contract on a played-out hand — The Canteen Sweep.
  if (s.result === 'made' && s.bidWinner === 'P') return { key: 'sweep' };

  // 4) Hard Set on a fully played-out hand — character-specific taunt for the busted bidder.
  if (s.result === 'hard' && s.playedOut) {
    if (s.bidWinner === 'W') return { key: 'doolow_set' };
    if (s.bidWinner === 'E') return { key: 'papacap_set' };
    return { key: 'g2_hardset' };
  }
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
          const card = aiPlay(s.turn, s.hands[s.turn], s.trick, s.trump, s.bidWinner, s.signals?.[s.turn], s.settings.difficulty, s.playedIds, RENEGE_RATE[s.settings.convictRenege] ?? 0.02);
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
  const [taunt, setTaunt] = useState(null);
  const [paused, setPaused] = useState(false);
  const [meldReveal, setMeldReveal] = useState(null);
  const trashRef = useRef(state.completedBooks.length);
  const snatchRef = useRef(0);
  const papacapLastHandRef = useRef(-999);
  const papacapGapRef = useRef(0);
  const aiRenegeSeenRef = useRef(0);
  const kittyRef = useRef(false);
  const meldRef = useRef(false);
  const meldPendingRef = useRef(null);
  const bidLogRef = useRef(state.bidLog?.length || 0);
  const fireTaunt = (key, seat) => setTaunt({ key, seat });

  useEffect(() => {
    saveGame({ bankrolls: state.bankrolls, settings: state.settings, dealer: state.dealer, stats: state.stats });
  }, [state.bankrolls, state.settings, state.dealer, state.stats]);

  useEffect(() => {
    soundRef.current.setEnabled(state.settings.sound);
  }, [state.settings.sound]);

  // Reset the once-per-hand cutscene guards when a fresh hand is dealt.
  useEffect(() => {
    if (state.phase === 'dealing' || state.phase === 'config') {
      kittyRef.current = false;
      meldRef.current = false;
      meldPendingRef.current = null;
      setMeldReveal(null);
    }
  }, [state.phase]);

  // Settlement transition: trigger an event cutscene WITH its accompanying SFX cue.
  useEffect(() => {
    if (state.phase === 'settlement' && prevPhase.current !== 'settlement') {
      const cs = settlementCutscene(state);
      const snd = soundRef.current;
      if (cs) {
        setCutscene({ key: cs.key, blocking: true, data: cs.data });
        if (cs.key === 'renege' || cs.key === 'falseaccuse' || cs.key === 'chopper') {
          snd.renege();
          if (cs.key === 'renege') snd.tableSlamThunder();
        } else if (cs.key === 'hardset' || cs.key === 'doolow_set' || cs.key === 'papacap_set' || cs.key === 'g2_hardset') snd.busted();
        else if (cs.key === 'sweep' || cs.key === 'portal') {
          snd.win();
          if (cs.key === 'portal') snd.portalHum();
        } else if (cs.key === 'concession') snd.play();
      } else if (state.result === 'busted') snd.busted();
      else if (state.settlement && state.settlement.transfers.some((t) => t.to === 'P')) snd.win();
      else snd.lose();
    }
    prevPhase.current = state.phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.result, state.settlement, state.busted]);

  // "Kitty Prayer" — high bidder flips the kitty on a 90+ contract.
  useEffect(() => {
    if (state.phase === 'discard' && state.kittyCollected && !kittyRef.current) {
      kittyRef.current = true;
      if ((state.bid || 0) > 95 && !cutscene) setCutscene({ key: 'kittyprayer', blocking: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.kittyCollected]);

  // Meld reveal phase — on the first entry into play, show milestone cutscenes
  // (1000 Aces / 90 Nutz) then the Meld Phase modal.
  useEffect(() => {
    if (state.phase === 'play' && !meldRef.current) {
      meldRef.current = true;
      const meld = state.meld[state.bidWinner];
      const items = [...(meld?.items || []), ...(state.bidderAcesItem ? [state.bidderAcesItem] : [])];
      const total = items.reduce((n, i) => n + i.pts, 0);
      const has1000 =
        items.some((i) => i.name.startsWith('Double Aces')) ||
        Object.values(state.defenderAces || {}).includes('double');
      const has90 = items.some((i) => i.name.includes('90 Nuts'));
      const reveal = { bidder: state.bidWinner, items, total };
      if (has1000 || has90) {
        meldPendingRef.current = reveal;
        setCutscene({ key: has1000 ? 'aces1000' : 'nuts90', blocking: true });
      } else {
        setMeldReveal(reveal);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Non-blocking taunt clips when an AI opponent places a bid (DooLow / PapaCap / big bid).
  useEffect(() => {
    const log = state.bidLog || [];
    if (log.length > bidLogRef.current) {
      const last = log[log.length - 1];
      bidLogRef.current = log.length;
      if (last && last.kind === 'bid' && (last.seat === 'W' || last.seat === 'E')) {
        const val = parseInt((/\$(\d+)/.exec(last.text) || [])[1] || '0', 10);
        if (last.seat === 'W') fireTaunt('doolow_bid', 'W');
        else fireTaunt(val >= 80 ? 'papacap_bigbid' : 'papacap_bid', 'E');
      }
    } else {
      bidLogRef.current = log.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bidLog]);

  // Non-blocking taunt clips (rendered in avatar frames / transparent overlay) as books complete.
  useEffect(() => {
    if (state.phase !== 'play') {
      trashRef.current = state.completedBooks.length;
      return;
    }
    if (state.completedBooks.length > trashRef.current) {
      trashRef.current = state.completedBooks.length;
      const last = state.completedBooks[state.completedBooks.length - 1];
      const w = last?.winner;
      const plays = last?.plays || [];
      const busy = cutscene?.blocking || meldReveal;
      const counters = plays.filter((p) => COUNTER_RANKS.has(p.card.rank)).length;

      // G2 wins a book holding 3+ counters (Aces / 10s / Kings) -> full-screen "3 Bang" cinematic.
      if (w === 'P' && counters >= 3 && !busy) {
        setCutscene({ key: 'g2_3bang', blocking: true });
      } else if (
        // G2 plays an Ace AND captures an opponent's Ace in the same book -> "Snatchin' teeth" taunt.
        w === 'P' &&
        plays.some((p) => p.seat === 'P' && p.card.rank === 'A') &&
        plays.some((p) => p.seat !== 'P' && p.card.rank === 'A') &&
        !busy
      ) {
        const now = Date.now();
        if (now - snatchRef.current > 3500) {
          snatchRef.current = now;
          fireTaunt('g2_teeth', 'P');
        }
      }

      // PapaCap (E) wins a book -> randomized taunt from the scene pool, throttled to
      // every 3-5 hands so it never spams back-to-back. Rendered silent in E's avatar frame.
      if (w === 'E' && !busy) {
        const hand = state.stats?.handsPlayed ?? 0;
        if (hand - papacapLastHandRef.current >= papacapGapRef.current) {
          const pool = ['papacap_scene_1', 'papacap_scene_2', 'papacap_scene_3', 'papacap_scene_4'];
          papacapLastHandRef.current = hand;
          papacapGapRef.current = 3 + Math.floor(Math.random() * 3); // gap of 3-5 hands
          fireTaunt(pool[Math.floor(Math.random() * pool.length)], 'E');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.completedBooks.length, state.phase]);

  // AI-on-AI renege catching (Convict Mode): a fellow convict occasionally busts an AI
  // that slipped an illegal card, rather than only the human being able to Call Renege.
  useEffect(() => {
    if (state.phase !== 'play' || state.settings.difficulty !== 'hard') {
      aiRenegeSeenRef.current = 0;
      return undefined;
    }
    const aiRen = (state.trickReneges || []).filter((r) => r.seat !== 'P');
    if (aiRen.length === 0) {
      aiRenegeSeenRef.current = 0;
      return undefined;
    }
    if (aiRen.length > aiRenegeSeenRef.current) {
      aiRenegeSeenRef.current = aiRen.length;
      if (Math.random() < 0.4) {
        const t = setTimeout(() => dispatch({ type: 'CALL_RENEGE' }), 550);
        return () => clearTimeout(t);
      }
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.trickReneges, state.phase, state.settings.difficulty]);

  // Drive the game loop, but PAUSE it while a cutscene / meld modal / audit is open.
  useEffect(() => {
    if (cutscene?.blocking || paused || meldReveal) return undefined;
    const id = drive(state, dispatch, soundRef.current);
    return () => id && clearTimeout(id);
  }, [state, cutscene, paused, meldReveal]);

  const clearCutscene = () => {
    setCutscene(null);
    if (meldPendingRef.current) {
      const reveal = meldPendingRef.current;
      meldPendingRef.current = null;
      setMeldReveal(reveal);
    }
  };
  const clearMeldReveal = () => setMeldReveal(null);
  const clearTaunt = () => setTaunt(null);

  const act = (action) => {
    const snd = soundRef.current;
    if (action.type === 'START_ROUND' || action.type === 'NEXT_HAND' || action.type === 'RESET_TABLE') {
      snd.ensure();
    }
    if (action.type === 'PLACE_BID') snd.chip();
    else if (action.type === 'PLAY_CARD') snd.play();
    else if (action.type === 'DECLARE_TRUMP') snd.trump();
    dispatch(action);
  };

  return { state, act, sound: soundRef.current, cutscene, clearCutscene, setPaused, meldReveal, clearMeldReveal, taunt, clearTaunt };
}
