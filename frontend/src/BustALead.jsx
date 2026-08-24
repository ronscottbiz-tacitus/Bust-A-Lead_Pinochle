import { useState } from 'react';
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
} from './components/Modals';
import { legalPlays } from './game/trick';
import { TABLE_BG_IMG } from './game/constants';

export default function BustALead() {
  const { state, act } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showMeld, setShowMeld] = useState(false);
  const s = state;

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
      {s.phase !== 'config' && (
        <>
          <Header
            state={s}
            onToggleSound={() => act({ type: 'UPDATE_SETTINGS', settings: { sound: !s.settings.sound } })}
            onOpenRules={() => setShowRules(true)}
            onOpenStats={() => setShowStats(true)}
            onNewGame={() => setShowNewGame(true)}
            onOpenMeld={() => setShowMeld(true)}
          />
          <Table state={s} onOpenHistory={() => setShowHistory(true)} />
          <HandTray state={s} onCardClick={onCardClick} />
          <ActionBar state={s} act={act} />
          <DealAnimation state={s} />
        </>
      )}

      {s.phase === 'config' && <ConfigScreen state={s} act={act} />}
      {s.phase === 'settlement' && <SettlementModal state={s} act={act} />}
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
    </div>
  );
}
