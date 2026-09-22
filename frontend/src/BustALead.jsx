import { useState, useEffect, useRef } from 'react';
import { useGame } from './hooks/useGame';
import { Header, Table, HandTray, DealAnimation } from './components/Table';
import { ActionBar } from './components/ActionBar';
import {
  ConfigScreen,
  SettlementModal,
  RulebookModal,
  StatsModal,
  BookReplayModal,
  NewGameConfirmModal,
  MeldDrawer,
  YardCourtModal,
  MeldPhaseModal,
  CinematicsModal,
  ThrowInConfirmModal,
  DedicationModal,
} from './components/Modals';
import { legalPlays } from './game/trick';
import { TABLE_BG_IMG } from './game/constants';
import {
  CutsceneOverlay,
  TauntOverlay,
  TitleVideo,
} from './components/CutsceneOverlay';
import { Zap } from 'lucide-react';
import { TutorialOverlay, RenegeNotice } from './components/Tutorial';

// Hoisted so the same array reference is passed on every render (no needless re-renders).
const PLAYER_SEAT = ['P'];

export default function BustALead() {
  const { state, act, cutscene, clearCutscene, setPaused, meldReveal, clearMeldReveal, taunt, clearTaunt, lastCutscene, replayLastCutscene, playCutscene, matchOutroDone } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showMeld, setShowMeld] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showCinematics, setShowCinematics] = useState(false);
  const [showThrowIn, setShowThrowIn] = useState(false);
  const [showDedication, setShowDedication] = useState(false);
  const [renegeNotice, setRenegeNotice] = useState(false);
  const [tutorialKey, setTutorialKey] = useState(0);
  const introShownRef = useRef(false);
  const renegeLessonRef = useRef(false);
  const s = state;

  // The final match outro just finished — roll the Dedication & Origin tribute.
  useEffect(() => {
    if (matchOutroDone) setShowDedication(true);
  }, [matchOutroDone]);

  // New Fish match intro cinematic — once per session when a New Fish match launches.
  useEffect(() => {
    if (
      s.phase === 'dealing' &&
      s.settings.difficulty === 'easy' &&
      s.settings.tutorialHints &&
      !introShownRef.current
    ) {
      introShownRef.current = true;
      playCutscene('newbooty_intro');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  // Pause the game engine while the Yard Court audit is open.
  useEffect(() => {
    setPaused(showAudit);
  }, [showAudit, setPaused]);

  // The always-pinned CALL RENEGE button is available in Convict Mode during play.
  const showRenegeButton = s.settings.difficulty === 'hard' && s.phase === 'play';

  const onCardClick = (card) => {
    if (s.phase === 'discard' && s.bidWinner === 'P') {
      act({ type: 'TOGGLE_DISCARD', id: card.id });
    } else if (s.phase === 'play' && s.turn === 'P' && !s.trickPending && !s.humanAcesPending) {
      if (s.settings.difficulty === 'hard') {
        // Convict mode: any card is playable; the reducer inspects for reneges.
        act({ type: 'PLAY_CARD', seat: 'P', card });
        return;
      }
      const legal = legalPlays(s.hands.P, s.trick, s.trump);
      if (legal.some((c) => c.id === card.id)) act({ type: 'PLAY_CARD', seat: 'P', card });
      else if (s.settings.tutorialHints) {
        // Full renege lesson only in New Fish (once per session); otherwise a quick notice.
        if (s.settings.difficulty === 'easy' && !renegeLessonRef.current) {
          renegeLessonRef.current = true;
          playCutscene('renege_lesson');
        } else {
          setRenegeNotice(true);
        }
      }
    }
  };

  return (
    <div
      className="min-h-screen w-full overflow-hidden relative bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${TABLE_BG_IMG})` }}
    >
      {/* Dark overlay / vignette for readability over the concrete table backdrop */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(4,8,11,0.42) 0%, rgba(4,8,11,0.62) 62%, rgba(4,8,11,0.82) 100%)',
        }}
      />
      {s.phase === 'config' && <TitleVideo />}
      {s.phase !== 'config' && (
        <>
          <Header
            state={s}
            onToggleSound={() => act({ type: 'UPDATE_SETTINGS', settings: { sound: !s.settings.sound } })}
            onToggleTaunts={() => act({ type: 'UPDATE_SETTINGS', settings: { muteTaunts: !s.settings.muteTaunts } })}
            onOpenRules={() => setShowRules(true)}
            onOpenStats={() => setShowStats(true)}
            onNewGame={() => setShowNewGame(true)}
            onOpenMeld={() => setShowMeld(true)}
            onOpenCinematics={() => setShowCinematics(true)}
            onThrowIn={() => setShowThrowIn(true)}
          />
          <Table state={s} onOpenHistory={() => setShowHistory(true)} taunt={taunt} onTauntDone={clearTaunt} />
          <HandTray state={s} onCardClick={onCardClick} />
          <ActionBar state={s} act={act} />
          <DealAnimation state={s} />
        </>
      )}

      {s.phase === 'config' && (
        <ConfigScreen
          state={s}
          act={act}
          onOpenDedication={() => setShowDedication(true)}
          onReplayTutorial={() => {
            introShownRef.current = false;
            renegeLessonRef.current = false;
            setTutorialKey((k) => k + 1);
            act({ type: 'UPDATE_SETTINGS', settings: { tutorialHints: true } });
          }}
        />
      )}
      {s.phase === 'settlement' && <SettlementModal state={s} act={act} onReplay={replayLastCutscene} canReplay={!!lastCutscene} />}
      {showRules && <RulebookModal onClose={() => setShowRules(false)} onOpenDedication={() => { setShowRules(false); setShowDedication(true); }} />}
      {showStats && (
        <StatsModal
          stats={s.stats}
          onClose={() => setShowStats(false)}
          onReset={() => act({ type: 'RESET_STATS' })}
        />
      )}
      {showHistory && <BookReplayModal completedBooks={s.completedBooks} onClose={() => setShowHistory(false)} />}
      {showMeld && <MeldDrawer state={s} onClose={() => setShowMeld(false)} />}
      {showCinematics && <CinematicsModal onClose={() => setShowCinematics(false)} />}
      {showRenegeButton && (
        <button
          data-testid="call-renege-btn"
          onClick={() => setShowAudit(true)}
          className="fixed bottom-6 right-6 z-[70] px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 border-2 border-rose-300/50 text-white font-display font-black tracking-wide flex items-center gap-2 shadow-[0_6px_0_rgba(0,0,0,0.5)] active:scale-95 animate-pulse"
        >
          <Zap size={18} /> CALL RENEGE!
        </button>
      )}
      {showAudit && (
        <YardCourtModal
          state={s}
          onClose={() => setShowAudit(false)}
          onAccuse={(seat, book) => {
            setShowAudit(false);
            act({ type: 'CALL_RENEGE', accuseSeat: seat, book });
          }}
        />
      )}
      {showNewGame && (
        <NewGameConfirmModal
          onCancel={() => setShowNewGame(false)}
          onRedeal={() => {
            act({ type: 'RESET_TABLE' });
            setShowNewGame(false);
          }}
          onMainMenu={() => {
            act({ type: 'NEW_GAME' });
            setShowNewGame(false);
          }}
        />
      )}
      <CutsceneOverlay cutscene={cutscene} onDone={clearCutscene} muted={s.settings.muteTaunts} />
      <TauntOverlay taunt={taunt} seats={PLAYER_SEAT} onDone={clearTaunt} />
      {showThrowIn && (
        <ThrowInConfirmModal
          onCancel={() => setShowThrowIn(false)}
          onConfirm={() => {
            setShowThrowIn(false);
            act({ type: 'THROW_IN' });
          }}
        />
      )}
      {showDedication && (
        <DedicationModal
          onClose={() => setShowDedication(false)}
          onPlayAgain={() => {
            setShowDedication(false);
            if (s.phase !== 'config') act({ type: 'NEW_GAME' });
          }}
        />
      )}
      {meldReveal && <MeldPhaseModal reveal={meldReveal} onClose={clearMeldReveal} />}
      <TutorialOverlay key={tutorialKey} state={s} />
      {renegeNotice && <RenegeNotice onDismiss={() => setRenegeNotice(false)} />}
    </div>
  );
}
