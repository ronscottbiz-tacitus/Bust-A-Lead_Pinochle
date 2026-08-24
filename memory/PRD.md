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

## Updates (2026-06 — Difficulty Engine, Convict Mode, Kitty, Spotlight, DiscardHUD, Stats)
- **Difficulty tiers** (`settings.difficulty`, splash selector): 'easy' (New Booty — timid AI
  bidding, naive non-cooperative defenders), 'normal' (Inmate — full strategy), 'hard'
  (Convict). Wired through `evaluateBid`/`aiPlay` in `ai.js` via `useGame.js`.
- **Convict unconstrained mode**: no legal-card highlighting, every card clickable
  (`HandTray` + `BustALead.onCardClick`). Reneging physically allowed; reducer `PLAY_CARD`
  inspects illegal plays with ~95% AI catch → immediate Hard Set with "BUS' A LEAD VIOLATION
  (RENEGE)" banner (settlement offender pays hard-set penalty to both other seats).
- **Visible deal kitty**: `CenterArea` shows the 5 face-down kitty cards labeled "THE KITTY"
  during dealing + auction, persisting until the bidder claims the contract (then "KITTY COLLECTED").
- **Bidder spotlight** (`useBidderSpotlight`): gold banner "<SEAT> TOOK THE CONTRACT AT <bid>"
  flashes ~2.8s when the auction concludes.
- **Dynamic Discard HUD** (`DiscardHUD`): live meld recalculation as cards are buried; shows
  Bid / Active Meld / Books Needed / Books to Save; green "Max Safety Floor" badge when
  Bid−Meld ≤ floor; flashing red "BOARD SET WARNING (>50 Books Required)".
- **Session stats**: added `winStreak`/`bestStreak` tracking (human net-positive hands) and a
  "Best Win Streak" row in the Stats modal; persisted in localStorage.
- **Splash restyle**: `splash_busalead.png` hero, amber/charcoal buttons (no neon), bid labels
  "60"/"65", subtitle "CUTTHROAT PINOCHLE • CDCR PRISON RULES".
- Verified: all 7 Jest engine tests pass; frontend testing agent 100% (iteration_9.json).

## Backlog (P1/P2)
- P2: Difficulty-specific defender AI depth (Convict smarter card counting).
- P2: Split `Table.jsx` (~850 lines) into per-component files (non-urgent).

## Updates (2026-06 — Request 7: Avatar Scaling & Table Prominence)
- Enlarged seat portraits (`Table.jsx` `Seat`): bordered avatar cards (w-16→w-24 responsive)
  with nameplates ("Them"/"Ya'll"/"You"), live bankroll chips (`seat-bankroll-*`) and book
  counts beneath each seat. "You" seat (bottom-left) enlarged to match.
- Active-turn glow: high-visibility cyan ring + neon on whichever seat is acting (auction
  bidder or play turn); gold ring + "BID" badge on the current bidder.
- Avatar reactions (`useTableReactions` hook): transient floating green badge flashes next to
  the seat that wins a book (`+N`/`Book!`, ~1.6s), and a win/loss net-$ flash for all seats at
  settlement. Uses existing `.react-pop` CSS animation.
- Verified: all 7 Jest engine tests pass; frontend testing agent 100% (iteration_8.json) — no
  card/HUD overlap, cards remain clickable.
