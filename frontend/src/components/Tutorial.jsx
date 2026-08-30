import { useState, useEffect } from 'react';
import { Lightbulb, AlertTriangle } from 'lucide-react';

// Sequential "New Booty" coaching tooltips, keyed to game milestones. Each shows once per
// session (until a New Game resets them). The wrapper is click-through; only the callout card
// captures clicks so the game underneath stays fully playable.
const STEPS = [
  {
    id: 'bidding',
    title: 'Placing a Bid',
    text: 'Bids start at 60 (or 65 depending on house rules). Only bid if your hand has enough meld points or strong trump to reach the target without getting set.',
    pos: 'center',
    match: (s) => s.phase === 'auction',
  },
  {
    id: 'kitty',
    title: 'The Kitty & Burying',
    text: 'Collect the 5 kitty cards, then select 5 cards to bury. Any buried counters (A, 10, K) count toward your final score!',
    pos: 'center',
    match: (s) => s.phase === 'discard' && s.bidWinner === 'P',
  },
  {
    id: 'meld',
    title: 'Meld Declaration',
    text: 'Meld points are tallied before trick play. Runs, Marriages, and Pinochles add up quickly!',
    pos: 'top-right',
    match: (s) => s.phase === 'play' && !!s.bidWinner,
  },
  {
    id: 'trickplay',
    title: 'Trick Play & Leading Trump',
    text: 'You must follow the suit that was led. If you have none, you must play a trump card if you have one.',
    pos: 'top-center',
    match: (s) => s.phase === 'play' && s.turn === 'P' && !s.trickPending && s.trickNo === 1,
  },
];

const POS = {
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-right': 'top-24 right-3 sm:right-8',
  'top-center': 'top-[72px] left-1/2 -translate-x-1/2',
};

export function TutorialOverlay({ state }) {
  const [seen, setSeen] = useState({});

  // Reset the whole tour whenever we return to the config/menu (a New Game).
  useEffect(() => {
    if (state.phase === 'config') setSeen({});
  }, [state.phase]);

  if (!state.settings.tutorialHints) return null;
  const step = STEPS.find((st) => st.match(state) && !seen[st.id]);
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none" data-testid="tutorial-overlay">
      <div
        data-testid={`tutorial-tooltip-${step.id}`}
        className={`tutorial-pop pointer-events-auto absolute ${POS[step.pos]} w-[min(90vw,360px)] rounded-2xl border-2 border-amber-400 bg-slate-950/95 shadow-[0_0_40px_rgba(255,199,0,0.45)] p-4`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-black shrink-0">
            <Lightbulb size={16} />
          </span>
          <h3 className="font-display font-black text-amber-300 text-base tracking-wide uppercase">
            {step.title}
          </h3>
        </div>
        <p className="text-sm text-slate-100 leading-relaxed font-sub">{step.text}</p>
        <button
          data-testid="tutorial-got-it-btn"
          onClick={() => setSeen((v) => ({ ...v, [step.id]: true }))}
          className="mt-3 w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-display font-black tracking-wide active:scale-95 transition-transform"
        >
          Got It
        </button>
      </div>
    </div>
  );
}

// Brief high-contrast warning shown when a New Booty player taps a card they can't legally play.
export function RenegeNotice({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      data-testid="renege-notice"
      className="tutorial-pop fixed z-[125] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,420px)] rounded-2xl border-2 border-rose-500 bg-slate-950/97 shadow-[0_0_44px_rgba(244,63,94,0.5)] p-5"
    >
      <div className="flex items-center gap-2 mb-2 text-rose-300">
        <AlertTriangle size={20} />
        <h3 className="font-display font-black text-lg tracking-wide uppercase">Illegal Move — Renege!</h3>
      </div>
      <p className="text-sm text-slate-100 leading-relaxed font-sub">
        You must <b className="text-rose-200">follow the suit led</b>, and if you're void you must
        play a <b className="text-rose-200">trump</b> when you have one. Playing an illegal card is a{' '}
        <b className="text-rose-200">renege</b>.
      </p>
      <p className="mt-2 text-sm text-slate-200 leading-relaxed font-sub">
        Get caught and you're <b className="text-amber-300">Set</b>: a <b>Soft Set</b> pays each
        opponent the stake, and a <b>Hard Set</b> (a renege) <b className="text-rose-200">doubles</b>{' '}
        that payout. Stay legal!
      </p>
      <button
        data-testid="renege-notice-dismiss"
        onClick={onDismiss}
        className="mt-4 w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-display font-black tracking-wide active:scale-95 transition-transform"
      >
        Got It
      </button>
    </div>
  );
}
