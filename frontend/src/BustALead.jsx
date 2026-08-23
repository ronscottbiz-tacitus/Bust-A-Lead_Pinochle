import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { Header, Table, HandTray } from './components/Table';
import { ActionBar, MeldBoard } from './components/ActionBar';
import { ConfigScreen, SettlementModal, RulebookModal } from './components/Modals';
import { legalPlays } from './game/trick';

export default function BustALead() {
  const { state, act } = useGame();
  const [showRules, setShowRules] = useState(false);
  const s = state;

  const onCardClick = (card) => {
    if (s.phase === 'discard' && s.bidWinner === 'P') {
      act({ type: 'TOGGLE_DISCARD', id: card.id });
    } else if (s.phase === 'play' && s.turn === 'P' && !s.trickPending && !s.humanAcesPending) {
      const legal = legalPlays(s.hands.P, s.trick, s.trump);
      if (legal.some((c) => c.id === card.id)) act({ type: 'PLAY_CARD', seat: 'P', card });
    }
  };

  return (
    <div className="felt-bg min-h-screen w-full overflow-hidden relative">
      {s.phase !== 'config' && (
        <>
          <Header
            state={s}
            onToggleSound={() => act({ type: 'UPDATE_SETTINGS', settings: { sound: !s.settings.sound } })}
            onOpenRules={() => setShowRules(true)}
          />
          <Table state={s} />
          <MeldBoard state={s} />
          <HandTray state={s} onCardClick={onCardClick} />
          <ActionBar state={s} act={act} />
        </>
      )}

      {s.phase === 'config' && <ConfigScreen state={s} act={act} />}
      {s.phase === 'settlement' && <SettlementModal state={s} act={act} />}
      {showRules && <RulebookModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
