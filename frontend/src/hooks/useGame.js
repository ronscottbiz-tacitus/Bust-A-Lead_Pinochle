import { useReducer, useEffect, useRef, useState } from 'react';
import { reducer, initState } from '../game/reducer';
import { saveGame } from '../game/storage';
import { SEATS, SPEED, COUNTER_RANKS, applySeatRoster, SEAT_CHAR } from '../game/constants';
import { evaluateBid, chooseTrump, chooseDiscards, shouldGoDouble, laydownChallenge, aiPlay, aiConcede } from '../game/ai';
import { saveTarget } from '../game/scoring';
import { SoundEngine } from '../audio/sfx';
import { createCutsceneManager, charOfClip } from '../game/cutsceneManager';
import { getChar, buildSeatChars } from '../config/characters';

// Convict-tuning renege probabilities per play (settings.convictRenege).
const RENEGE_RATE = { off: 0, low: 0.02, high: 0.06 };

// Generic character caption shown when a flair clip fires mid-hand (so a pooled
// settlement clip like papacap_set never shows its "got set" banner out of context).
const CHAR_BANNER = {
  PapaCap: "PAPACAP TALKIN' NOISE",
  Doolow: "DOOLOW RUNNIN' HIS MOUTH",
  G2: 'G2 ON ONE',
};

// Cutscene priority tiers (lower = higher priority).
const CUTSCENE_TIER = {
  portal: 1, game_over_1: 1, game_over_2: 1,
  renege: 2, falseaccuse: 2, doolow_scene_renege: 2,
  hardset: 2, doolow_set: 2, papacap_set: 2, g2_hardset: 2,
  babyboy_hardset: 2, scrap_hardset: 2,
  renege_lesson: 3, newbooty_intro: 3, g2_teeth: 3, g2_3bang: 3,
  babyboy_taunt: 3, scrap_slam: 3,
  doolow_scene_takeover: 4, doolow_scene_cut: 4,
  papacap_scene_1: 5, papacap_scene_2: 5, papacap_scene_3: 5, papacap_scene_4: 5,
};
const tierOf = (key) => CUTSCENE_TIER[key] ?? 3;

function aiBidAction(s, seat) {
  const prof = getChar(SEAT_CHAR[seat]).aiProfile;
  const { maxBid } = evaluateBid(s.hands[seat], s.settings.bidBase, s.settings.difficulty, s.settings.convictBoldness, prof.aggression);
  const nextVal = s.bid == null ? s.settings.bidBase : s.bid + 5;
  if (maxBid >= nextVal) return { type: 'PLACE_BID', seat };
  return { type: 'PASS', seat };
}

// Maps a settlement state to the cutscene { key, data } that should play (or null).
// Priority: elimination > concession > renege/violation > win/hard-set milestones.
export function settlementCutscene(s) {
  // 0) Match over — random full-screen victory outro before the final score screen.
  if (s.gameOver) {
    return { key: Math.random() < 0.5 ? 'game_over_1' : 'game_over_2' };
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
    return { key: getChar(SEAT_CHAR[s.bidWinner]).cutscenes.hardSet || 'hardset' };
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
          if (aiConcede(s.bidWinner, s.hands[s.bidWinner], s.trump, bench, getChar(SEAT_CHAR[s.bidWinner]).aiProfile.concessionRate)) {
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
  // Keep the live seat->character roster in sync with the human's pick + chosen opponents.
  applySeatRoster(buildSeatChars(state.settings.playerChar, state.settings.oppW, state.settings.oppE));
  const soundRef = useRef(null);
  if (!soundRef.current) soundRef.current = new SoundEngine();
  const prevPhase = useRef(state.phase);
  const [cutscene, setCutscene] = useState(null);
  const [taunt, setTaunt] = useState(null);
  const [paused, setPaused] = useState(false);
  const [meldReveal, setMeldReveal] = useState(null);
  const [lastCutscene, setLastCutscene] = useState(null);
  const trashRef = useRef(state.completedBooks.length);
  const isInitialMount = useRef(true);
  const aiRenegeSeenRef = useRef(0);
  const kittyRef = useRef(false);
  const meldRef = useRef(false);
  const meldPendingRef = useRef(null);
  const bidLogRef = useRef(state.bidLog?.length || 0);
  const cutsceneRef = useRef(null);
  const mgrRef = useRef(null);
  if (!mgrRef.current) mgrRef.current = createCutsceneManager();

  // Single-slot cutscene setter with tier arbitration. A higher-priority (lower tier)
  // clip discards a pending lower-priority one. Flair frequency/rotation is governed
  // upstream by the CutsceneManager; this only handles the display slot. Returns true.
  const requestCutscene = (key, opts = {}) => {
    const tier = tierOf(key);
    const cur = cutsceneRef.current;
    if (cur && tierOf(cur.key) <= tier) return false;
    const cs = { key, blocking: true, data: opts.data };
    cutsceneRef.current = cs;
    setCutscene(cs);
    setLastCutscene({ key, data: opts.data });
    return true;
  };

  // Sole gateway for personality/flair cutscenes. Every character-taunt opportunity
  // (AI bid, book win, cut, takeover, big meld) routes through here; the manager
  // enforces the global cooldown, per-character lockout, equal 1/3 rotation and
  // anti-repeat, then we play the chosen clip full-screen with a character banner.
  const requestFlair = (s) => {
    const hand = s.stats?.handsPlayed ?? 0;
    const trick = hand * 25 + s.completedBooks.length;
    // Only OG opponents (DooLow / PapaCap) actually seated can do ambient taunts.
    const idToMgr = { doolow: 'Doolow', papacap: 'PapaCap' };
    const seated = ['W', 'E'].map((seat) => idToMgr[SEAT_CHAR[seat]]).filter(Boolean);
    const clip = mgrRef.current.requestFlair({ trick, hand, seated });
    if (!clip) return false;
    const character = charOfClip(clip);
    return requestCutscene(clip, { data: { banner: CHAR_BANNER[character] } });
  };

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
      setLastCutscene(null);
    }
  }, [state.phase]);

  // Settlement transition: trigger an event cutscene WITH its accompanying SFX cue.
  useEffect(() => {
    if (state.phase === 'settlement' && prevPhase.current !== 'settlement') {
      const cs = settlementCutscene(state);
      const snd = soundRef.current;
      if (cs) {
        requestCutscene(cs.key, { data: cs.data });
        mgrRef.current.notePriority(cs.key);
        if (cs.key === 'renege' || cs.key === 'falseaccuse') {
          snd.renege();
          if (cs.key === 'renege') snd.tableSlamThunder();
        } else if (cs.key === 'hardset' || cs.key === 'doolow_set' || cs.key === 'papacap_set' || cs.key === 'g2_hardset' || cs.key === 'babyboy_hardset' || cs.key === 'scrap_hardset') snd.busted();
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
      if ((state.bid || 0) > 95 && !(state.bidWinner === 'W' && (state.bid || 0) >= 90)) {
        requestCutscene('kittyprayer');
        mgrRef.current.notePriority('kittyprayer');
      }
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
        const mkey = has1000 ? 'aces1000' : 'nuts90';
        requestCutscene(mkey);
        mgrRef.current.notePriority(mkey);
      } else {
        setMeldReveal(reveal);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Any AI opponent bid is a personality (flair) opportunity — routed through the
  // CutsceneManager, which picks an eligible character at random (equal 1/3) and throttles.
  useEffect(() => {
    const log = state.bidLog || [];
    if (log.length > bidLogRef.current) {
      const last = log[log.length - 1];
      bidLogRef.current = log.length;
      if (last && last.kind === 'bid' && (last.seat === 'W' || last.seat === 'E')) {
        requestFlair(state);
      }
    } else {
      bidLogRef.current = log.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bidLog]);

  // On each RESOLVED trick: G2's two signature achievements fire IMMEDIATELY as full-screen
  // cutscenes (bypassing the ambient cooldown); otherwise the book is a normal AI-opponent
  // flair opportunity. Strict lifecycle guards ensure this NEVER evaluates on mount / deal /
  // auction — only after a real trick has been collected in the PLAYING phase.
  useEffect(() => {
    // Guard 1: never run on component mount / initial load.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      trashRef.current = state.completedBooks.length;
      return;
    }
    // Guard 2: only during active play (never config / dealing / auction / settlement).
    if (state.phase !== 'play') {
      trashRef.current = state.completedBooks.length;
      return;
    }
    // Guard 3: only when a NEW trick has just resolved (book count advanced).
    const advanced = state.completedBooks.length > trashRef.current;
    trashRef.current = state.completedBooks.length;
    if (!advanced) return;
    if (cutscene?.blocking || meldReveal) return;

    const last = state.completedBooks[state.completedBooks.length - 1];
    const plays = last?.plays || [];
    // Guard 4: the trick must actually contain played cards.
    if (plays.length === 0) return;
    const won = last?.winner === 'P';
    const pc = SEAT_CHAR.P; // the human's chosen character

    // Signature-book detectors (only meaningful when the human wins the trick).
    const aceCatch =
      won &&
      plays.some((p) => p.seat === 'P' && p.card.rank === 'A') &&
      plays.some((p) => p.seat !== 'P' && p.card.rank === 'A');
    const counters = plays.filter((p) => COUNTER_RANKS.has(p.card.rank)).length;
    const threeCounter = won && counters >= 3;
    const lead = plays[0];
    const pPlay = plays.find((p) => p.seat === 'P');
    const trumpSlam = won && lead && lead.card.suit !== state.trump && pPlay && pPlay.card.suit === state.trump;

    // Each hustler earns a different immediate full-screen cutscene (bypasses cooldown).
    let earned = null;
    if (won) {
      if (pc === 'g2') earned = aceCatch ? 'g2_teeth' : threeCounter ? 'g2_3bang' : null;
      else if (pc === 'babyboy') earned = threeCounter ? 'babyboy_taunt' : null;
      else if (pc === 'scrap') earned = trumpSlam || threeCounter ? 'scrap_slam' : null;
    }

    if (earned) {
      requestCutscene(earned);
      mgrRef.current.notePriority(earned);
    } else {
      requestFlair(state);
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
      // Catch chance = the strongest renege detection among the non-offending seats
      // (Scrap = 100%, so any renege at his table is always busted).
      const offender = aiRen[aiRen.length - 1]?.seat;
      const catchers = SEATS.filter((x) => x !== offender);
      const chance = Math.max(0, ...catchers.map((x) => getChar(SEAT_CHAR[x]).aiProfile.renegeDetection));
      if (Math.random() < chance) {
        const t = setTimeout(() => dispatch({ type: 'CALL_RENEGE' }), 550);
        return () => clearTimeout(t);
      }
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.trickReneges, state.phase, state.settings.difficulty]);

  // A high contract fires a personality cutscene: an AI opponent routes through the
  // ambient manager; the human as Baby Boy earns his taunt on a 90+ contract.
  useEffect(() => {
    if (state.phase === 'trump' && (state.bid || 0) >= 90) {
      if (state.bidWinner === 'P') {
        if (SEAT_CHAR.P === 'babyboy') {
          requestCutscene('babyboy_taunt');
          mgrRef.current.notePriority('babyboy_taunt');
        }
      } else {
        requestFlair(state);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Drive the game loop, but PAUSE it while a cutscene / meld modal / audit is open.
  useEffect(() => {
    if (cutscene?.blocking || paused || meldReveal) return undefined;
    const id = drive(state, dispatch, soundRef.current);
    return () => id && clearTimeout(id);
  }, [state, cutscene, paused, meldReveal]);

  const clearCutscene = () => {
    cutsceneRef.current = null;
    setCutscene(null);
    if (meldPendingRef.current) {
      const reveal = meldPendingRef.current;
      meldPendingRef.current = null;
      setMeldReveal(reveal);
    }
  };
  const clearMeldReveal = () => setMeldReveal(null);
  const clearTaunt = () => setTaunt(null);
  // Re-watch the last blocking cutscene that fired this hand (Settlement "Replay" button).
  const replayLastCutscene = () => {
    if (lastCutscene) {
      const cs = { key: lastCutscene.key, blocking: true, data: lastCutscene.data };
      cutsceneRef.current = cs;
      setCutscene(cs);
    }
  };
  // Fire a specific full-screen blocking cutscene by key (tutorial intro / renege lesson).
  const playCutscene = (key) => requestCutscene(key);

  const act = (action) => {
    const snd = soundRef.current;
    if (action.type === 'START_ROUND' || action.type === 'NEXT_HAND' || action.type === 'RESET_TABLE') {
      snd.ensure();
    }
    if (action.type === 'RESET_TABLE') mgrRef.current.reset();
    if (action.type === 'PLACE_BID') snd.chip();
    else if (action.type === 'PLAY_CARD') snd.play();
    else if (action.type === 'DECLARE_TRUMP') snd.trump();
    dispatch(action);
  };

  return { state, act, sound: soundRef.current, cutscene, clearCutscene, setPaused, meldReveal, clearMeldReveal, taunt, clearTaunt, lastCutscene, replayLastCutscene, playCutscene };
}
