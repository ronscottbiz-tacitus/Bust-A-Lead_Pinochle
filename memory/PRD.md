# Bust a Lead — Product Requirements Document

## Original Problem Statement
Single-player card game web app "Bust a Lead": a fast-paced, high-stakes 3-player variation of
Cutthroat Pinochle played against two strategic AI opponents (West, East). Built with React,
Tailwind CSS, Lucide-React icons, and the Web Audio API for procedural sound. Frontend-only.

## User Choices
- Persist game state locally (localStorage)
- Strategic AI (evaluates meld / trump / card counting)
- Modern/sleek dark neon casino theme
- Build the FULL state machine end-to-end
- Sound on by default with mute toggle

## Architecture
- **Frontend-only** React SPA. No backend, no auth, no database.
- Game engine as pure functions + a reducer state machine:
  - `src/game/constants.js`, `deck.js`, `meld.js`, `trick.js`, `ai.js`, `reducer.js`, `storage.js`
  - `src/hooks/useGame.js` — useReducer + effect-driven AI/timing driver + Web Audio triggers
  - `src/audio/sfx.js` — procedural Web Audio SFX (deal/play/chip/trump/busted/win/lose)
  - UI: `src/components/Table.jsx` (Header, seats, center, HandTray), `ActionBar.jsx`,
    `Modals.jsx` (Config, Settlement, Rulebook), `Card.jsx`, `ErrorBoundary.jsx`
  - `src/BustALead.jsx` orchestrator, mounted from `App.js`
- State persisted: bankrolls, settings, dealer (localStorage key `bust-a-lead-save-v1`).

## Implemented (2026-06)
- 80-card deck (4× 10/J/Q/K/A per suit, 9s stripped); trick rank A>10>K>Q>J.
- Deal 25/25/25 + 5-card Kitty (kitty dealt mid-sequence); $100 starting bankrolls.
- Pre-game config: bid base 60/65, sort by suit/rank, animation speed, sound toggle.
- Auction: clockwise from left of dealer, +5 steps, pass, drop-on-dealer at base.
- Trump declaration gated on holding a Marriage (K+Q); no marriage → Soft Set.
- Kitty pickup (30 cards), expose/hide, mandatory 5-card bury, Going Double, Lay-Down
  (unchallenged/challenged), Concede.
- Bidder meld board (marriages, runs, pinochle, arounds + doubles).
- Defender Aces declaration (single/double); human must declare before card 1 or Bust.
- 25-trick engine: follow-suit + head-the-trick + trump/overtrump enforcement; legal-move
  highlighting; counters (A/10/K = 1 book, 48 total, +2 on trick 25).
- Save benchmark 20 books (31 for Going Double); Hard/Soft Set logic.
- Busted-a-Lead enforcement (renege / undeclared aces) → Hard Set on offender.
- Settlement: base $1/$2, multipliers compound (Going Double ×2, Lay-Down Challenged ×2,
  Spades ×2); animated modal with transfers; Game Over at $0.
- Persistent header (bankrolls, dealer, trump badge w/ gold pulse on Spades, trick counter,
  stakes multiplier, live book tracker), Rulebook & Meld Reference modal.
- Procedural Web Audio SFX with mute toggle.

## Verification
- Jest engine simulation: 60 full hands reach settlement, 25 tricks each, zero-sum bankroll
  conserved, dealer rotation — all pass (`src/game/__tests__/engine.test.js`).
- Testing agent (browser): config → deal → 25-card hand renders, auction/modals/toggles work.

## Backlog (P1/P2)
- P1: Richer AI trick strategy (signalling, defender cooperation vs bidder).
- P1: Deal animation polish (per-packet card flight to seats).
- P2: Hand history / running session stats panel.
- P2: Difficulty selector; adjustable table stakes.
