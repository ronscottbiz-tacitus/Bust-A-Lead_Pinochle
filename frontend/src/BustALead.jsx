import { useState, useEffect } from 'react';
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
} from './components/Modals';
import { legalPlays } from './game/trick';
import { TABLE_BG_IMG } from './game/constants';
import {
  CutsceneOverlay,
  TauntOverlay,
  TitleVideo,
} from './components/CutsceneOverlay';
import { Zap } from 'lucide-react';

export default function BustALead() {
  const { state, act, cutscene, clearCutscene, setPaused, meldReveal, clearMeldReveal, taunt, clearTaunt, lastCutscene, replayLastCutscene } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showMeld, setShowMeld] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showCinematics, setShowCinematics] = useState(false);
  const s = state;

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
          />
          <Table state={s} onOpenHistory={() => setShowHistory(true)} taunt={taunt} onTauntDone={clearTaunt} />
          <HandTray state={s} onCardClick={onCardClick} />
          <ActionBar state={s} act={act} />
          <DealAnimation state={s} />
        </>
      )}

      {s.phase === 'config' && <ConfigScreen state={s} act={act} />}
      {s.phase === 'settlement' && <SettlementModal state={s} act={act} onReplay={replayLastCutscene} canReplay={!!lastCutscene} />}
      {showRules && <RulebookModal onClose={() => setShowRules(false)} />}
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
      <TauntOverlay taunt={taunt} seats={['P']} onDone={clearTaunt} />
      {meldReveal && <MeldPhaseModal reveal={meldReveal} onClose={clearMeldReveal} />}
    </div>
  );
}
