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

## Updates (2026-06 — New Taunt Library Rewire + Full-Width Mobile Bottom Bar)
- **Cutscene key remap** (`useGame.js settlementCutscene`): new keys wired — `portal` (G2 wins the
  match: gameOver && P bankroll > 0), `chopper` (G2 eliminated), `sweep` (G2 makes contract),
  `doolow_set` / `papacap_set` (DooLow/PapaCap hard-set, played out), `g2_hardset` (G2 hard-set),
  `falseaccuse` (false accusation), `renege`, `concession`, `hardset`. SFX cue switch updated to match.
- **Non-blocking TauntLayer** (`CutsceneOverlay.jsx` `TauntLayer`, wired in `BustALead.jsx`): small
  bottom-left clip that does NOT pause the game loop. Triggers in `useGame.js`:
  - AI bid → `doolow_bid` (W) / `papacap_bid` (E) / `papacap_bigbid` (E, bid ≥ $80). Detected via
    `state.bidLog` growth (last entry kind='bid').
  - AI captures an opponent Ace → `g2_teeth` (throttled 3.5s) + TTS snatch.
  - G2 wins 3 books in a row → `g2_3bang`.
  - Random AI book win (12%) now spoken-taunt only (removed the old blocking `trashtalk` cutscene).
- **New taunt/cutscene assets NOT yet uploaded** (`doolow_taunt_1/2`, `papacap_taunt_1/2`,
  `g2_portal`, `g2_renege`, `g2_sweep`, `g2_3bang`, `g2_teeth`) — both overlays triple-guard
  auto-skip (onError + load timer + hard cap) so missing files never hang the game. Old assets
  (canteen_sweep, cutscene_renege_busted, hand_concede, hardset_canteen, get2_chopper, kitty_prayer,
  1000_aces, 90_nuts, trashtalk_smirk) still serve as fallbacks/plays where referenced.
- **Mobile G2 bar → full-width bottom status bar** (`Table.jsx`): `mobile-g2-bar` now
  `fixed inset-x-0 bottom-0 z-50 border-t` edge-to-edge console-HUD; mobile `player-hand` raised to
  `bottom-14` (15px gap, no overlap). Desktop dock unchanged.
- Verified: 10/10 Jest; testing agent iteration_21.json 100% — mobile bar full-width no-overlap,
  cards tappable, 5 hands to settlement with no cutscene hang, non-blocking bid taunt observed while
  auction continued, desktop non-regression, zero console errors / zero asset 404s.

## Asset upload status (2026-06) — COMPLETE
- **All 9 new-library assets uploaded + WebM-encoded + serving 200**: `doolow_taunt_1`,
  `doolow_taunt_2`, `papacap_taunt_1`, `papacap_taunt_2`, `g2_renege`, `g2_sweep`, `g2_portal`,
  `g2_3bang`, `g2_teeth` (each mp4 + vp9 webm in `/public/assets/cutscenes/`). Every cutscene/taunt
  trigger now has a real video; nothing skips for missing assets anymore.

## Updates (2026-06 — Cutscene Presentation Rework + Full TTS Purge)
- **Removed the corner PiP taunt box** (`TauntLayer` deleted from `CutsceneOverlay.jsx`). Minor taunts
  now render as reaction clips INSIDE the opponent avatar portrait frames:
  - `AvatarTaunt` (new, exported) fills a seat's rounded avatar frame (`absolute inset-0 object-cover`)
    when `taunt.seat === seat`. `data-testid=avatar-taunt-<seat>`. Wired into `Seat` (W/E) in `Table.jsx`;
    `Table` now takes `taunt`/`onTauntDone` props passed from `BustALead`.
  - `TauntOverlay` (new, exported) = transparent, centered, non-blocking clip (no box/border) for the
    player's own celebration (`g2_3bang`, seat P). `data-testid=taunt-overlay-P`. Rendered in `BustALead`.
  - Taunt→seat mapping (`useGame.fireTaunt(key, seat)`): `doolow_bid`→W, `papacap_bid`/`papacap_bigbid`→E,
    `g2_teeth`→capturing AI seat, `g2_3bang`→P.
- **Major cutscenes stay full-screen** (`CutsceneOverlay`): full-viewport `z-[130]` overlay with a dark
  radial vignette backdrop, `cutscene-banner`, `cutscene-skip-btn`, triple-guard auto-dismiss.
- **Native video audio**: all cutscene/taunt `<video>` elements are now UNMUTED so the clip's embedded
  audio plays (title loop stays muted/ambient). Every WebM was remuxed to VP9 video + **opus audio**
  (copied video, fast) so the preview Chromium also gets sound; MP4s carry H.264/AAC.
- **TTS fully purged**: deleted `src/audio/tts.js`; removed all `TtsEngine`/SpeechSynthesis calls from
  `useGame.js`; removed the "Taunt Voices" config toggle (`Modals.jsx`) and the `settings.voices`
  default (`reducer.js`). Grep confirms 0 SpeechSynthesis references remain.
- Verified: 10/10 Jest; testing agent iteration_22.json 100% — corner box gone, avatar-taunt-W/E render
  inside seats while the auction keeps running, concession cutscene full-viewport (1920x1080) with skip,
  settlement reached across 5 hands with no hang, no SpeechSynthesis, zero console errors, mobile bar +
  tappable cards non-regression. (taunt-overlay-P code path validated; 3-book streak is rare in play.)

## Updates (2026-06 — Full-Length Playback, Muted Avatar Taunts, Yard Reels Gallery)
- **Full-length video playback** (`CutsceneOverlay.jsx`): removed the premature hard-cap timeouts on
  ALL `<video>` wrappers (major cutscenes + `useTauntTimers`). Clips now play to their natural
  `onEnded` or until the user taps Skip. Only a short load-guard remains (dismiss ONLY if playback
  never starts, e.g. a missing asset) so the game still never hangs. Removed the unused `CAP` map.
- **Muted avatar taunts** (`AvatarTaunt`, `TauntOverlay`): both now carry the `muted` attribute so the
  in-frame opponent reaction clips and the player overlay never fight the game SFX. Full-screen major
  cutscenes (`CutsceneOverlay`) stay UNMUTED and keep their native audio track.
- **Yard Reels cinematics gallery**: new `Film`-icon nav button (`cinematics-btn`, both desktop +
  mobile Header clusters) opens `CinematicsModal` (`Modals.jsx`) — a grid of ~20 thumbnail cards
  (`reel-thumb-<base>`, thumbnail seeks to `#t=0.5` for a poster frame, tagged Cinematic/Taunt/Ambient).
  Tapping a thumbnail opens `ReelPlayer` (`reel-player-<base>`): full-screen, native controls, audio,
  a Skip button (`reel-skip-btn`, back to grid) and a Close button (`reel-close-btn`, closes modal).
  Library manifest = `CUTSCENE_LIBRARY` + `videoSources(basename)` exported from `CutsceneOverlay.jsx`.
- **Media prep**: all WebMs remuxed to VP9 video + opus audio (copied video) so preview Chromium also
  gets sound; MP4s carry H.264/AAC. All ~20 assets serve 200.
- Verified: 10/10 Jest; testing agent iteration_23.json 100% — gallery opens with 20 thumbs (desktop +
  mobile), reel Skip/Close both work, major cutscenes render full-viewport UNMUTED and are not cut short
  (reached settlement without a premature-timeout hang), avatar taunts render with `video.muted===true`
  while the auction keeps running, zero console errors, mobile bar non-regression.

## Backlog (P1/P2)
- P2: Difficulty-specific defender AI depth (Convict smarter card counting).
- P2: Split `Table.jsx` (~850 lines) into per-component files (non-urgent).

## Updates (2026-06 — Convict Taunt Voices, browser TTS)
- **Spoken AI taunts** via the browser Web Speech API (no keys, offline) — new `src/audio/tts.js`
  `TtsEngine`. DooLow (W) = higher pitch/faster rate; PapaCap (E) = deeper/slower; distinct
  system voices when available. Follows the Sound On/Off setting; fails open if unsupported.
- **Triggers** (`useGame.js`):
  - Trash-talk cutscene → speaks a random user-provided one-liner in the involved AI's voice.
    Speaker = the AI who won the book (random 12% book-win) or PapaCap (E) on a FALSE ACCUSATION.
    Lines: "Brought that ass to the grinder, huh?", "Have heart, have money.", "I'm tryna eat,
    homey! Back up!", "Y'all sweeter than bear meat!", "What y'all got on my spread tonight?".
  - **"Snatchin' teeth!"** spoken (in the capturing AI's voice) whenever an AI captures an
    opponent's Ace in a completed book — throttled to once per 3.5s to avoid spam; suppressed
    while a cutscene/meld modal is up.
  - TTS primed on the deal / new-hand button gesture (`act()`) so iOS/Safari unlock speech.
- Verified: 10/10 Jest pass, clean compile, no console errors on load. NOTE: audible TTS cannot
  be verified in the headless CI (Playwright Chromium ships no voices / no audio out); it works
  on real Chrome/Safari/Edge/Firefox. Web Speech API presence confirmed; code fails open safely.
- **Taunt Voices toggle** (2026-06): added a separate `settings.voices` on/off Choice in
  ConfigScreen (testid `cfg-voices-on`/`cfg-voices-off`, default On), independent of the Sound
  (SFX) toggle. `useGame` sets `ttsRef.setEnabled(settings.voices !== false)` — players can keep
  SFX while muting the trash talk. Verified rendering + clean compile.

## Updates (2026-06 — Kitty Prayer threshold + Tablet/Landscape fan unification)
- **Kitty Prayer trigger** (`useGame.js`): now fires strictly on `bid > 95` (was `>= 90`).
- **Tablet/landscape hand** (`Table.jsx` HandTray): removed the old suit-tab filter branch
  (768–1023px). All non-mobile viewports (≥768px) now use ONE clean zero-scroll dynamic fan;
  card size is responsive (`fanSize = isDesktop ? 'lg' : 'md'`, `cardW = isDesktop ? 80 : 56`).
  Mobile (<768px) still uses the 4-column suit matrix (unchanged). Removed testids: `suit-tab-*`,
  `suit-count-*`.
- Verified: testing agent iteration_19.json 100% on fan layout across 900x600 / 844x390 /
  390x844 / 1920x800 — single-row fan fits within width, no suit-tab UI remains, mobile matrix
  intact, zero console errors, no horizontal scrollbar. (Card tap in the fan uses the same
  interactive renderCard already validated in iteration_18.)

## Updates (2026-06 — get2_chopper asset + Mobile HUD Overlap Refactor)
- **get2_chopper.mp4** uploaded + WebM encoded; the GET-2 Extraction elimination cutscene now
  plays (was auto-skipping while the file was missing). All 11 cutscenes live.
- **Mobile/portrait HUD refactor** (Table.jsx + ActionBar.jsx):
  - G2 badge no longer floats over the Spades column. On mobile (`useViewport().mobile`) the
    desktop bottom-left dock is hidden (`!isMobile`) and a compact `mobile-g2-bar` pill is docked
    at the top (fixed top-[52px], below the header) — verified no overlap with `player-hand`.
  - Auction/trump/laydown controls (`WRAP_POS.center`) are now responsive
    `top-[16%] sm:top-[40%]` so on mobile they sit in the upper felt between the AI seats and the
    kitty instead of over the kitty/hand.
  - `player-hand` retains z-30 + pointer-events-auto; card taps verified registering on mobile;
    4-column suit matrix fits with dynamic vStep compression, no overflow.
  - Desktop layout unchanged (dock bottom-left, auction centered); `mobile-g2-bar` absent on desktop.
  - Verified: testing agent iteration_18.json 100% via bounding-box comparisons + live card tap;
    desktop non-regression confirmed. NOTE: several player testids (seat-books-P, player-avatar,
    reaction-P, book-history-btn, dealer-chip-P, aces-badge-P) intentionally appear in BOTH the
    desktop dock and mobile pill branches, but the two are mutually exclusive so only one renders.

## Updates (2026-06 — Full 11-Cutscene Suite, Meld Phase Modal, Milestone/Signature Triggers)
- **Cutscene suite expanded to 11** (`CutsceneOverlay.jsx` CUTSCENE_FILE/CAP/BANNER). New assets
  under `/public/assets/cutscenes/` (each webm+mp4): `cutscene_kitty_prayer`, `cutscene_1000_aces`,
  `cutscene_90_nuts`, `break_yo_self`, `canteen_sweep`. `get2_chopper` is referenced but NOT
  uploaded — the `<video>` fails over to the SPA HTML and auto-skips gracefully (triple guard:
  onError + 2s load timer + hard cap).
- **New triggers** (`useGame.js`):
  - `kittyprayer` — bidder collects the kitty on a 90+ contract (phase→discard, bid≥90).
  - `aces1000` / `nuts90` — meld-reveal milestone: bidder meld (incl. pending Aces item) has
    Double Aces / Triple Pinochle (also fires aces1000 if any defender declared double aces).
  - `canteensweep` — G2 makes the contract at settlement.
  - `breakyoself` — AI bidder Hard Set at final scoring (played out) while G2 defends.
  - `chopper` — G2 eliminated at $0 bankroll (gameOver && bankrolls.P≤0), highest priority.
  - Settlement priority: elimination → concession → renege/violation → canteensweep → hardset/
    breakyoself (played-out only) → early-hard fallback = concession. SFX cue fires per key.
- **Meld Phase Transition Modal** (`Modals.jsx` MeldPhaseModal, wired via useGame `meldReveal`):
  shows the bidder's declared meld items + total for 3.5s when a hand enters play, pausing the
  engine (added to the drive pause gate); dismiss via Continue button, click-anywhere, or timeout.
  Milestone cutscene (if any) plays first, then the modal.
- **Meld pill** label now `<BidderName> Meld: <total> pts` (desktop); mobile stays compact `Np`.
- Verified: 10/10 Jest; node self-test of all 10 settlement mappings; testing agent iteration_17.json
  100% on deterministic checks (meld modal appears/pauses/auto-dismisses at 3.50s/click-dismiss,
  meld-pill label, missing-asset auto-skip, no regressions/console errors).
- NOTE: `get2_chopper.mp4` still needs to be uploaded to enable the elimination cutscene.

## Updates (2026-06 — Canteen Table Bg, Renege Replay, Audit Highlight)
- **New table surface**: `TABLE_BG_IMG` → `/assets/new_canteen_table.webp` (constants.js), the
  canteen-stakes overhead table. Rendered as the root `backgroundImage` in `BustALead.jsx`
  (bg-cover/center); all game UI plays on top unaffected.
- **Renege Replay** (`CutsceneOverlay.jsx`): the RENEGE CONFIRMED cutscene now overlays a
  slow-motion looping "INSTANT REPLAY" of the caught card (`renege-replay` / `renege-ring` CSS
  in index.css) plus the exact violation reason. Data flows from `useGame.settlementCutscene`
  which pulls the offending card from `state.playLog` by `renegeCall.seat + book` into
  `cutscene.data`.
- **Audit Highlight** (`Modals.jsx` YardCourtModal): auto-flags suspicious plays — flagged
  book buttons get a red pulsing dot + rose styling, the modal default-selects the first
  flagged book, the illegal opponent row is rose-bordered with a glowing red ring on the card
  and an `audit-flag-<seat>-<book>` reason line.
- Verified: testing agent iteration_16.json 100% — caught a live AI renege (J♣), replay +
  reason + RENEGE CONFIRMED settlement all correct; engine pauses during audit; no regressions.

## Updates (2026-06 — Cutscene Video Engine, Yard Court Renege Audit, AI Concession)
- **Cutscene Video Modal Engine** (`components/CutsceneOverlay.jsx`, wired in `BustALead.jsx`,
  driven by `hooks/useGame.js`): 5 clips under `/public/assets/cutscenes/`.
  - `cutscene_title_loop` — looping, muted background behind the config/splash (`TitleVideo`).
  - `cutscene_renege_busted` — RENEGE CONFIRMED / VIOLATION (5.0s cap).
  - `cutscene_hardset_canteen` — Hard Set / Busted / Board Set (5.0s cap).
  - `cutscene_hand_concede` — hand conceded (human or AI fold) (4.5s cap).
  - `cutscene_trashtalk_smirk` — false accusation + random AI book win (~12%) (4.5s cap).
  - Full-screen z-[130] overlay, Skip button (`cutscene-skip-btn`) + tap-anywhere, dialogue
    banner (`cutscene-banner`). Auto-dismiss on error/stall, 2s load-guard, hard cap. Game
    engine PAUSED while a blocking cutscene plays; accompanying synth SFX cue fires on start.
  - **CODEC NOTE**: each clip served as BOTH `.webm` (VP9, `<source>` first) and `.mp4`
    (H.264/AAC fallback). Open-source Chromium (Playwright + preview screenshotter) lacks
    proprietary H.264, so WebM is required for it to play; real Chrome/Safari/Edge use either.
    WebMs generated with `ffmpeg -an -c:v libvpx-vp9 -crf 34 -vf scale=1280:-2`.
- **Yard Court Renege Audit** (`Modals.jsx` `YardCourtModal`): pinned red `call-renege-btn`
  (bottom-right, Convict Mode, all 25 books) opens a paused inspection modal. `reducer.js`
  now records `s.playLog` per PLAY_CARD (book, lead, card, exact `handBefore` snapshot, legal
  flag + `renegeReason`). Modal shows a Book selector (`audit-book-N`), each opponent's played
  card + hand snapshot, and `accuse-<seat>-btn`. `CALL_RENEGE {accuseSeat, book}` validates
  Off-Suit Renege / Failure to Head / Failure to Cut/Overtrump / Undeclared Aces → valid =
  offender Hard Set (renege cutscene); false = accuser Hard Set (trashtalk cutscene).
- **AI Concession** (`ai.js` `aiConcede`): before leading Book 1 the AI bidder audits book
  equity; if 4+ below the save floor, DooLow(W) folds 75%, PapaCap(E) folds 35% →
  CONCEDE_PREPLAY (concession cutscene). Human bidder gets a `concede-hand-btn` at Book-1 lead.
- Verified: 10/10 Jest pass; testing agent iteration_15.json 7/8 (only failure was H.264
  playback in open-source Chromium — resolved by adding VP9/WebM sources; title video confirmed
  playing live). No app crashes/hangs; audit correctly pauses the engine.


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


## Updates (2026-06 — Request 8: Cards, Meld Visuals, Cinematic Triggers, Mobile Glow)
- Card borders (`Card.jsx`): face-up cards now use `border-2 border-slate-800` for crisp,
  high-contrast separation between overlapping hand-tray cards.
- DECLARED MELD modal (`Modals.jsx` `MeldPhaseModal`): each meld item row now renders a
  visual row of the actual card icons (`meld-phase-cards-<i>`) beneath its name+points.
- g2_teeth trigger (`useGame.js`): now fires ONLY when G2 plays an Ace AND captures an
  opponent's Ace in the same book (was: any AI capturing an Ace).
- g2_3bang trigger (`useGame.js` + `CutsceneOverlay.jsx`): now fires when G2 wins a book
  holding 3+ counters (A/10/K) and renders as a FULL-SCREEN blocking cutscene with skip
  controls (added `g2_3bang` banner). Removed the old "3 books in a row" streak logic.
- Counter/kitty tallying audit: verified correct via new jest suite
  `src/game/__tests__/counters.test.js` — 120+ simulated played-out hands always account for
  exactly 50 books; buried/kitty counters correctly feed the bidder's total (buriedBooks).
- Mobile active-bidder glow (`Table.jsx` + `index.css`): new `.bid-glow` pulsing cyan
  animation applied to the active bidder's HUD (seat boxes for W/E, `mobile-g2-bar` for G2)
  during the auction phase.
- Yard Reels thumbnails (`Modals.jsx` `CinematicsModal`): thumbnail container uses inline
  `aspectRatio: '16 / 9'` with an absolutely-positioned video, fixing skinny/stretched
  thumbnails on mobile.
- Verified: engine.test.js + counters.test.js (12 tests) pass; testing agent iteration_24.json
  100% on all 4 deterministically reachable items (card borders, meld visual breakdown,
  mobile bid glow, Yard Reels 16:9 thumbnails). No console errors/regressions.

## Updates (2026-06 — Request 9: Yard Reels grid + universal card strokes)
- Yard Reels (`Modals.jsx` CinematicsModal): responsive grid `grid-cols-2 sm:grid-cols-3
  lg:grid-cols-4`; each thumbnail container locked to 16:9 via `aspect-video` class + inline
  `aspectRatio: '16 / 9'` with an absolutely-positioned `object-cover` video (inner frame
  measured ~1.78 ratio).
- Card strokes (`Card.jsx`): face-down branch now uses `border-2 border-slate-800` (was
  `border border-cyan-500/25`), so opponent hands (DooLow/PapaCap) and kitty cards share the
  same crisp high-contrast stroke as the player's face-up hand.
- Verified: compiles clean, mobile screenshot confirms 16:9 thumbnails + bordered opponent/kitty cards.

## Updates (2026-06 — Request 10: New cutscene assets, PapaCap pool, SFX layering)
- Replaced major cinematics: `portal` key now prefers `g2_portal_2` (match-won) and `renege`
  key now prefers `g2_renege_2`; old files kept as fallbacks. Both encoded to VP9/Opus WebM +
  MP4 in public/assets/cutscenes/. Yard Reels library updated to the new bases (23 clips).
- PapaCap dynamic taunt pool (`useGame.js`): on a PapaCap (E) book win, a random clip from
  {papacap_scene_1,_2,_3} fires as a SILENT AvatarTaunt inside E's portrait, throttled to a
  random gap of 3-5 hands (papacapLastHandRef/papacapGapRef) so it never spams. Pool is
  data-driven — add papacap_scene_4 (FILE key + library entry + pool array) when uploaded.
- Programmatic SFX (`audio/sfx.js`): `tableSlamThunder()` (heavy slam + distant thunder,
  mixed under the voice) fires when the g2_renege_2 cutscene starts; `portalHum()` (detuned
  pad hum + rising swoosh + shimmer chime) fires when the g2_portal_2 match-won cutscene
  starts. Wired in the settlement-cutscene effect.
- NOTE: only papacap_scene_1..3 were provided (scene_4 pending upload).
- Verified: all 5 WebMs valid VP9/Opus, assets serve HTTP 200, frontend compiles clean,
  gallery renders all 5 new thumbnails.

## Updates (2026-06 — Request 11: Payout clarity, Convict rebalance, mute toggle, scene 4)
- PapaCap scene 4: papacap_scene_4 added (VP9/Opus WebM + MP4), wired into FILE map, Yard
  Reels library, and the E taunt pool (now 4 clips) in useGame.js.
- Payout rules: confirmed settlement is already pure player-to-player (no central pot in
  bankrolls) — Made = each opponent pays bidder 1x stake; Soft Set = bidder pays each opponent
  1x; Hard Set/Renege/False Accusation = offender pays each opponent 2x. Locked with new test
  src/game/__tests__/payouts.test.js (240 hands x 3 stake levels). Removed the misleading
  "Pot" label from the header: mobile+desktop now show "Stake: $X" and the table level is
  labelled "Table: $1/$2".
- Convict AI rebalance (ai.js): evaluateBid now uses a larger per-step divisor (4.6 vs 3.5)
  and a -1 step adjustment in hard mode so AI stops overbidding; aiPlay renege chance lowered
  0.09 -> 0.02 so reneges are far rarer.
- AI-on-AI renege catching (useGame.js): in Convict mode a fellow AI now catches an AI
  reneger ~40% of the time (dispatches CALL_RENEGE), instead of only the human being able to.
- Mute Taunts toggle: new setting `muteTaunts` (persisted). Added to ConfigScreen
  ("Cutscene Audio" On/Muted, testid cfg-taunt-audio-*) and to the header (desktop button +
  mobile menu item, testid taunt-audio-toggle). CutsceneOverlay video now honors `muted`.
- Verified: 13/13 jest tests pass (engine/counters/payouts); compiles clean; scene_4 serves
  HTTP 200; config + header UI confirmed via screenshot.

## Updates (2026-06 — Request 12: Game-over cutscene fix + Convict Tuning Dial)
- BUG FIX (game over): settlementCutscene() in useGame.js now returns {key:'portal'} on any
  s.gameOver (removed the chopper branch that fired when P was bankrupt). 'portal' resolves to
  g2_portal_2 with portalHum() SFX. Locked with unit test src/game/__tests__/gameover.test.js.
  (chopper asset/key remain but are unreachable via settlement — noted as dead code.)
- FEATURE (Convict Tuning Dial): new settings convictBoldness (cautious/balanced/bold) and
  convictRenege (off/low/high), shown in ConfigScreen ONLY under Convict difficulty
  (testid convict-tuning-dial). Boldness tunes evaluateBid hard-mode div/adjust
  (cautious 5.0/-2, balanced 4.6/-1, bold 3.5/0); renege maps to per-play probability
  RENEGE_RATE {off:0, low:0.02, high:0.06} threaded into aiPlay. evaluateBid/aiPlay gained
  optional boldness/renegeRate params (defaults keep existing tests valid).
- Verified: 14/14 jest tests pass; testing agent iteration_25.json 100% (game-over fix via
  code+jest, tuning dial visibility + control highlighting, taunt-audio + no-Pot regression).

## Updates (2026-06 — Request 13: PapaCap taunt fix, chopper removal, Replay button)
- BUG FIX (PapaCap taunts): the 3-5 HAND lockout permanently suppressed papacap_scene_1..4.
  Replaced with a light ~7s time cooldown (papacapTsRef, module-shared) + 50% roll on E
  book-wins, PLUS a scene taunt on PapaCap high bids (val>=70). Renders silent/non-blocking
  in E's avatar (AvatarTaunt, muted). Verified: 14 renders across 4 hands, no lockout.
- Chopper retired: removed get2_chopper from FILE map, BANNER, and CUTSCENE_LIBRARY; deleted
  the physical get2_chopper.mp4/.webm. gameOver already forces portal (kept as regression
  guard in gameover.test.js). No missing-asset errors.
- NEW: Replay Cutscene button in SettlementModal (data-testid replay-cutscene-btn). useGame
  tracks lastCutscene on every blocking setCutscene (settlement/kitty/meld-milestone/3bang),
  cleared on new hand; replayLastCutscene() re-opens it full-screen. Wired via BustALead.
- Verified: 14/14 jest pass; testing agent iteration_26.json 100% on all 4 targets, zero
  console errors.

## Updates (2026-06 — Request 14: Code-quality report triage)
- Reviewed auto-generated code-quality report. Applied the ONE safe fix: hoisted inline
  array prop seats={['P']} in BustALead.jsx to module const PLAYER_SEAT (referential stability).
- Intentionally NOT applied (documented as false positives / deferred):
  * useGame.js exhaustive-deps: effects drive a useReducer state machine; adding
    state/dispatch/setCutscene to the game-loop deps causes infinite loops / duplicate turns.
    The eslint-disable directives are correct and deliberate.
  * Table.jsx deps: resize listener ([] one-time) and ref-based prev comparisons are standard
    correct patterns.
  * storage.js "sensitive data in localStorage": false positive — stores only a single-player
    game save (bankrolls/settings/stats); no auth/PII/tokens. No encryption needed.
  * Complexity refactors (ActionBar/Modals/SettlementModal/YardCourtModal/BustALead/
    CutsceneOverlay): deliberately deferred to protect the verified, heavily-tested engine.
    Backlog: split Modals.jsx (>900 lines) into per-modal files when a dedicated refactor pass
    is scheduled.
- Verified: 14/14 jest pass; testing agent iteration_27.json 100% regression (10/10 hands,
  replay button 10/10, 195 PapaCap taunts, zero console errors).

## Updates (2026-06 — Request 15: PapaCap taunts -> full-screen cinematics)
- BUG FIX: PapaCap scene taunts (papacap_scene_1..4) were rendering as tiny SILENT avatar
  clips. Now they fire as FULL-SCREEN blocking CutsceneOverlay cinematics WITH AUDIO (same as
  g2_portal_2/g2_renege_2). useGame.js both triggers (E book-win ~50%/7s cooldown; E high bid
  >=70 guarded by !cutscene + cooldown) now call setCutscene({key,blocking:true}) +
  setLastCutscene({key}) instead of fireTaunt. Added BANNER captions for the 4 scenes.
- Audio follows the Cutscene Audio setting (muted={s.settings.muteTaunts}): unmuted when On,
  muted when Off — verified.
- Verified: 14/14 jest pass; testing agent iteration_28.json 100% — 16/16 full-screen (0 in
  avatar), skip+banner present, muted toggles correctly, zero console errors, no chopper.
- Minor backlog noted by QA: taunt-audio-toggle shares one data-testid in desktop+mobile
  headers (harmless, both call onToggleTaunts); extract a fireSceneWithCooldown helper to DRY
  the two PapaCap trigger sites.
