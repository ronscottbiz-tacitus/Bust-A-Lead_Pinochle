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

## Updates (2026-06 — G2 Rebrand, Triple Pinochle, Header Cleanup, Prison Audio, Taunts, Meld Tooltip)
- **Rebrand**: human player 'You' → 'G2' via SEAT_LABEL.P (propagates to dock, bubbles, logs, spotlight, settlement, stats). You-dock nameplate + letter fallback updated to G2.
- **Triple/Quad Pinochle**: `meld.js` PIN_PTS {1:4, 2:40, 3:90, 4:300}, label 'Triple Pinochle (90 Nuts!)'. Live in discard HUD / meld pill / drawer. Jest guard added (10/10).
- **Header cleanup (tablet+desktop)**: removed opponent bankroll chips from header (now only under avatars); left = Get2 logo (h-9) + title, center = single `status-capsule` (Pot • Trump • Stake [+ Book/Books in play]), right = Stats/Rules/Sound/New Game icon cluster.
- **Prison audio** (`sfx.js`, procedural Web Audio): deal = mechanical snaps; play = thud + metallic clank; renege = dual-tone siren + buzzer (new `renege()`, fired on CALL_RENEGE + renege busts); busted = iron-door slam w/ echo; win = whistle + jackpot chime.
- **Convict taunts** (bonus): `renegeTaunt()` shows a DooLow/PapaCap taunt (`convict-taunt`) on renege/false-accusation settlements only.
- **Meld tooltip** (bonus): meld-drawer lines are tappable (`meld-item-*`) to reveal the exact cards (`meld-cards-*`).
- Verified: 10/10 Jest; testing agent iteration_13.json 100%, zero console errors.
- Known maintainability note: Table.jsx >1000 lines (Header/Seat could be split later; deferred to avoid regression).


## Updates (2026-06 — 6 Bug Fixes: Meld Math, Modal Positioning, Mobile Header, Avatar, Card Backs, Desktop Cards)
- **Meld math**: `computeMeld` now scores the Trump Run first and only awards a Royal Marriage from K/Q NOT consumed by the run (no phantom +4). Pinochle/Arounds doubles already flat. New Jest guard added (9/9 pass).
- **Modal positioning**: `ActionBar` `Wrap` gained a `pos` prop — auction/trump/laydown centered on the felt, Bury-5 panel upper-center, play/aces/renege as a top banner — never over the cards.
- **Mobile header (<768)**: compact single 48px row — Get2 logo + 'Pot: $X • Trump' pill + Rules/Stats/kebab (kebab → Sound + New Game). Dealer indicator + bankrolls now live under each avatar (`dealer-chip-*`).
- **Player avatar**: letter fallback + onError so a broken image never renders; You dock now shows in all phases.
- **AI card backs**: DooLow/PapaCap face-down fans (`facedown-fan-W/E`) always rendered, sized via new Card `xs` (w-7 h-10 / lg:w-10 lg:h-14).
- **Desktop cards**: `lg` = w-20 h-32; center felt kept open for watermark/trick/kitty.
- **Meld pill** now computes the live discard total so it matches the drawer.
- Verified: 9/9 Jest; testing agent iteration_12.json 100% on the 6 fixes.


## Updates (2026-06 — Felt Watermark, Responsive Overhaul, Meld Drawer, Declare Aces, Call Renege, GTA Modals)
- Opponents renamed DooLow (W) / PapaCap (E) via SEAT_LABEL (single source; stats persist under W/E/P keys).
- **Get2 table watermark**: faint centered logo on the felt (`table-watermark`).
- **Responsive hand**: mobile <768 → 4-column vertical suit matrix (`suit-col-*`, zero-scroll, dynamic overlap); tablet 768–1023 → suit-tab filter + scaled avatars (`w-14 md:w-16 lg:w-24`); desktop ≥1024 → fan.
- **Collapsible Meld**: removed permanent center MeldRack; header `meld-pill` opens right `MeldDrawer` with itemized breakdown (live during discard).
- **Bidder Declare Aces**: `declare-bidder-aces-btn` (reminder in easy/normal, silent in Convict); forfeits if leading an Ace before declaring; AI auto-declares. Engine: finalizeDiscard separates aces item, DECLARE_BIDDER_ACES re-adds.
- **Convict Call Renege**: AI reneges ~9% mid-trick; `call-renege-btn` → RENEGE CONFIRMED (offender Hard-Set) or FALSE ACCUSATION (accuser Hard-Set). Player reneges ~95% auto-caught.
- **GTA modals + New Game flow**: modals restyled zinc-950/amber; New Game → `redeal-table-btn` / `main-menu-btn` (reset money + return to splash).
- Verified: 8/8 Jest; testing agent iteration_10.json ~95%, no functional bugs (fixed tablet header overlap, removed dead MeldRack). Declare-Aces & RENEGE-CONFIRMED probabilistic — paths verified, FALSE ACCUSATION seen live.


## Updates (2026-06 — Get2 Branding, Splash Refresh, Convict AI Depth)
- **Get2 header branding**: `get2-logo_bal_blk.png` in the top-left of the persistent header,
  wrapped in an anchor to https://get2.one (target=_blank, rel=noopener). `data-testid=get2-logo-link`.
- **Updated splash art**: config hero swapped to `splash2_bal.png` (Get2-hoodie dealer scene).
- **Convict AI depth** (`aiPlay` hard branch, `useGame` passes `s.playedIds`): the Convict bidder
  counts trumps seen (20 total) and bleeds high trump aggressively while defenders still hold
  trump (threshold 3+ or a top trump vs 5+ for Inmate), then cashes guaranteed off-suit Aces.
- Verified: 8/8 Jest tests pass (incl. new Convict trump-bleed test); assets serve 200; splash confirmed live.

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
