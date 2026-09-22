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

## Updates (2026-06 — Request 16: New Booty tutorial tooltip system)
- New setting settings.tutorialHints (default false; ConfigScreen difficulty onChange auto-sets
  it ON for New Booty/easy, OFF for others). Dedicated Tutorial Hints toggle (cfg-tutorial-on/off,
  CFG_TUTORIAL options). Persisted with other settings.
- New src/components/Tutorial.jsx: TutorialOverlay renders sequential, dismissible high-contrast
  spotlight callouts ("Got It") at milestones — bidding (auction), kitty (discard & P bidder),
  meld (play start), trickplay (P's first turn). Picks first unseen matching step; seen-state
  resets on phase==='config' (New Game). Renders only when tutorialHints is on. RenegeNotice
  warns (soft vs hard set + doubled penalty) when a New Booty player taps an illegal card.
- Table.jsx HandTray: illegal cards are tappable when tutorialHints is on (to trigger the notice);
  legal play unchanged. BustALead wires TutorialOverlay + RenegeNotice + illegal-tap handler.
- index.css: .tutorial-pop opacity-only entrance (avoids clobbering Tailwind centering transforms).
- Verified: 14/14 jest pass; testing agent iteration_29.json 100% — bidding/meld/trickplay
  tooltips sequential + dismissible, defaults correct, renege notice on illegal taps, Convict mode
  shows NO tooltips, zero console errors. (Kitty tooltip validated by code; not hit in auto-run
  because P didn't win a bid.)

## Updates (2026-06 — Request 17: New Booty tutorial cutscenes + Replay Tutorial button)
- New assets g2_newbooty_intro + g2_renege_lesson (VP9/Opus WebM + MP4). Mapped in
  CutsceneOverlay FILE (newbooty_intro / renege_lesson), BANNER captions, and CUTSCENE_LIBRARY
  (tag 'Tutorial') so they appear in Yard Reels.
- useGame exposes playCutscene(key) -> full-screen blocking cutscene + records lastCutscene.
- BustALead: introShownRef fires newbooty_intro once/session on config->dealing when
  difficulty==='easy' && tutorialHints; illegal-card tap in New Booty fires renege_lesson once
  (renegeLessonRef), subsequent illegal taps (any tutorial mode) show the RenegeNotice banner.
  Renege lesson now gated to difficulty==='easy' (New Booty) per spec.
- Replay Tutorial button (ConfigScreen, replay-tutorial-btn): resets introShownRef +
  renegeLessonRef, bumps TutorialOverlay key (reset tooltip tour), and re-enables tutorialHints.
- Verified: 14/14 jest pass; testing agent iteration_30.json 100% — intro fires/gates correctly
  (easy+hints only, once/session, replay re-arms it), renege lesson full-screen first time then
  notice, both in Yard Reels, assets HTTP 206, zero console errors.

## Updates (2026-06 — Request 18: DooLow cutscenes + priority/throttle resolver)
- 3 new DooLow cinematics (VP9/Opus WebM + MP4), mapped in CutsceneOverlay FILE/BANNER/LIBRARY:
  * doolow_scene_takeover (Tier4) — W wins contract at bid>=90; min 2 hands between (takeoverLastHandRef); fired in a phase==='trump' effect.
  * doolow_scene_cut (Tier4) — W trumps a non-trump led suit AND captures 2+ opponent counters; fired in completed-books effect.
  * doolow_scene_renege (Tier2) — AI-on-AI renege catch (Convict); requested just before CALL_RENEGE dispatch.
- Single-slot priority resolver requestCutscene(key,{data}) in useGame.js: CUTSCENE_TIER/tierOf
  (1 portal > 2 renege/settlement penalties/doolow_renege > 3 tutorial/meld/kitty > 4 flair
  g2_3bang/doolow_takeover/doolow_cut > 5 papacap pool). Rules: higher tier (lower num) discards
  pending lower-tier (cutsceneRef check); max ONE Tier4/5 flair per hand (flairUsedRef, reset each
  deal) — this also makes a bidding-phase flair suppress trick taunts for the rest of the hand.
  ALL cutscene sites (settlement/kitty/meld/g2_3bang/papacap/intro/lesson) now route through it;
  clearCutscene/replay keep cutsceneRef synced. CutsceneOverlay already full-screen + audio +
  tap-to-dismiss (root onClick=finish) + Skip.
- Verified: 14/14 jest; testing agent iteration_31.json 100% — 5 hands no soft-locks, every cutscene
  dismissible + resumes, one-flair-per-hand (0 violations), Tier-2 override after Tier-5 flair
  confirmed, 3 DooLow reels in gallery, all assets HTTP 200, 0 console errors.
- Known harmless: a leftover { flair:true } arg is passed at some requestCutscene calls but flair is
  derived from tier (opts.flair unused) — no behavior impact.

## Updates (2026-06 — Request 29: Opponent Picker — hand-pick both rivals)
- characters.js: new buildSeatChars(playerChar, oppW, oppE) resolves the full roster from explicit
  opponent picks, falling back to the auto pairing for any unset/invalid choice and guaranteeing three
  distinct seats (opponents never equal the human pick or each other). ROSTER_IDS exported.
- reducer settings: added oppW / oppE (default null = auto). useGame now applies
  buildSeatChars(playerChar, oppW, oppE) each render.
- ConfigScreen: new OpponentSelect component (data-testid opp-select-w / opp-select-e, chips
  opp-w-<id> / opp-e-<id>) — two rows of avatar chips for the 4 non-player characters; the chip the
  other seat uses is disabled to prevent duplicates. Choices persist in settings.
- Verified: 14/14 jest; live flow — picked Baby Boy (left) + PapaCap (right) as G2, seats in-game
  matched exactly (Scrap absent), duplicate chip auto-disabled, player's own char excluded, no errors.

## Updates (2026-06 — Request 28: Master Update — title artwork + asset optimization)
- SECTION 1 (title art): ingested pinochle-title-img.webp -> /assets/images/title_splash.jpg
  (webp->jpg, <=1920px). ConfigScreen splash now uses it in a 16:9 aspect-video container
  (bg-neutral-950, object-contain, no distortion/crop of the baked title). Removed the redundant
  DOM subtitle (gta-subtitle) since the new image carries the baked-in "BUS' A LEAD / CUTTHROAT
  PINOCHLE • CDCR PRISON RULES" banner (Note: this reinstates the CDCR wording via baked art, per the
  new asset). Verified desktop + mobile (390px), zero horizontal overflow, splash loads.
- SECTION 6 (asset optimization): title splash re-encoded to <=1920px jpg (~455KB); all 5 avatars
  resized to <=512px. Cutscene videos already ship as web-optimized mp4 + VP9/Opus webm.
- SECTIONS 2/4/5 were ALREADY implemented in Requests 25-27 and re-verified this pass:
  * S2 character registry + Pick Your Hustler selector + dynamic seating (>=1 hustler opponent) — done.
  * S4 cutscene engine — all triggers present (renege/concession/trashtalk/1000-aces/90-nuts,
    kitty prayer strictly on bid > 95, character-specific hardset scrap/babyboy, scrap_slam/babyboy_taunt,
    skip+tap-dismiss, fail-open). No change needed.
  * S5 meld reveal modal (3.5s tap-to-continue) + persistent meld pill/MeldDrawer — done.
- SECTION 3 (mobile): assessed live at 390x844 — current responsive layout already meets the goals:
  player badge is a docked bottom horizontal bar (no spade-column overlap), auction box in upper-middle
  felt, Bid/Pass panel docked upper-right (never over the hand), card columns fit vertically with intact
  hitboxes, zero horizontal overflow. Left as-is to avoid regressing the working layout.

## Updates (2026-06 — Request 27: New G2/DooLow/PapaCap portraits + hustler-guaranteed opponents)
- Swapped in user portraits: avatar_g2.png (new profile-g2), avatar_doolow.png (profile-doolow),
  avatar_papacap.png (profile-papacap). These feed both the picker and the in-game seat portraits.
- Opponent seating (characters.js seatCharsFromPlayer) now guarantees >=1 AI opponent is a hustler
  (Scrap/G2/Baby Boy) via a deterministic OPPONENTS map: g2->{W:scrap,E:doolow},
  babyboy->{W:scrap,E:papacap}, scrap->{W:babyboy,E:doolow}. Both OGs remain reachable; deterministic
  per pick so seats never reshuffle mid-render. Character AI profiles auto-apply per seat (e.g. an AI
  Scrap plays tight, never concedes, catches 100% of reneges).
- Cutscene manager is now SEAT-AWARE: requestFlair takes `seated` (OG opponents actually at the table)
  and only lets DooLow/PapaCap taunt when they're seated — fixes phantom PapaCap taunts when PapaCap
  isn't in the game. Hard-set cutscenes already character-correct for any seat (AI Scrap set ->
  scrap_hardset, AI Baby Boy set -> babyboy_hardset).
- Verified: 14/14 jest; live table shows Scrap (L) + DooLow (R) + G2 (dock) with new art; full-hand
  smoke ran clean — only doolow ambient taunt fired, zero phantom PapaCap, zero console errors.

## Updates (2026-06 — Request 26: Pick Your Hustler portraits swapped)
- Replaced hustler avatars with uploaded profile images: G2, Baby Boy, Scrap (backgrounds kept).

## Updates (2026-06 — Request 25: Unified Character Registry + "Pick Your Hustler")
- NEW src/config/characters.js — CHARACTERS registry (g2, babyboy, scrap, doolow, papacap) with name,
  moniker, avatar, aiProfile {aggression, concessionRate, renegeDetection}, and character-specific
  cutscene keys. PLAYER_PICKS=[g2,babyboy,scrap]; DEFAULT_SEAT_CHARS {W:doolow,E:papacap,P:g2};
  seatCharsFromPlayer(pick) (opponents fixed DooLow/PapaCap w/ same-character guard); getChar().
- constants.js: SEAT_LABEL/SEAT_AVATAR/SEAT_MONIKER/SEAT_CHAR are now live mutable objects updated by
  applySeatRoster(seatChars); useGame calls applySeatRoster(seatCharsFromPlayer(settings.playerChar))
  every render, so all existing SEAT_LABEL[seat]/SEAT_AVATAR[seat] reads stay valid and swap dynamically.
- Assets: generated 5 GTA-style portrait avatars -> /assets/avatars/avatar_{g2,babyboy,scrap,doolow,
  papacap}.png. Added user cutscenes cutscene_babyboy_taunt/hardset + cutscene_scrap_slam/hardset
  (mp4 + VP9/Opus webm) with FILE/BANNER/CUTSCENE_LIBRARY entries (also in Yard Reels).
- ConfigScreen: new HustlerSelect (data-testid hustler-select, hustler-g2/babyboy/scrap) 3-card picker
  (avatar+moniker+blurb) writing settings.playerChar (persisted). Player dock (Table.jsx desktop +
  mobile-g2-bar) shows the picked character's name/avatar/bankroll dynamically.
- AI: difficulty stays baseline, character profile layered on top — evaluateBid gets per-seat aggression
  (aggAdj ~ -1..+1 steps), aiConcede gets per-character concessionRate, AI-on-AI renege catch chance =
  max renegeDetection among non-offender seats (Scrap=100%). Signatures backward-compatible (defaults
  keep all 14 jest tests green).
- Cutscene binding (character-aware): hard set -> getChar(SEAT_CHAR[bidWinner]).cutscenes.hardSet
  (scrap_hardset/babyboy_hardset/g2_hardset/doolow_set/papacap_set, fallback hardset); human earned
  clips branch on SEAT_CHAR.P (g2->g2_teeth/g2_3bang, babyboy->babyboy_taunt on 3-counter book or 90+
  bid, scrap->scrap_slam on trump-cut/3-counter book); all bypass ambient cooldown via requestCutscene+
  notePriority and are excluded from the ambient rotation (still DooLow/PapaCap only).
- Verified: 14/14 jest; testing agent iteration_34.json 100% — selector, dynamic dock, DooLow/PapaCap
  fixed opponents, persistence across reload, 2 full hands settled as Baby Boy & Scrap, no earned clip
  fired before first card, character-correct hard-set, 4 new Yard Reels thumbnails, 0 console errors.

## Updates (2026-06 — Request 24: Yard Reels "Play All" slideshow)
- Added a "Play All" button (data-testid play-all-btn) to the CinematicsModal header (Modals.jsx). It
  starts an auto-advancing full-screen slideshow through the entire CUTSCENE_LIBRARY (30 clips).
- ReelPlayer extended with an optional `slideshow` prop: onEnded auto-advances to the next clip; adds
  prev/next chevrons (reel-prev-btn / reel-next-btn, prev disabled on clip 1), a live counter
  (reel-slideshow-counter "N / total"), a "Grid" button (reel-grid-btn) back to the gallery, and the Skip
  button relabels to "Next". Slideshow container testid reel-slideshow. Single-clip view is unchanged
  (still reel-player-<base>). Auto-exits to the grid after the final clip; Close (X) shuts the modal.
- Verified live: Play All opens at 1/30, Next 1→3, Prev 3→2 with title/counter updating, Grid returns to
  gallery, clips play full-screen with audio and auto-advance on end; zero console errors.

## Updates (2026-06 — Request 23: Copy/terminology — "Behind the Wall" Rules + New Fish)
- Ruleset rebrand: all "CDCR Prison Rules" copy → "Behind the Wall" Rules. ConfigScreen subtitle now
  'Cutthroat Pinochle • "Behind the Wall" Rules' (Modals.jsx); splash alt text updated; index.html
  <title> = 'Bus' A Lead: Cutthroat Pinochle - "Behind the Wall" Rules' and meta description updated.
- Tier rename: difficulty 'easy' label "New Booty" → "New Fish" (Modals CFG_DIFFICULTY). Yard Reels
  gallery title "New Booty Intro" → "New Fish Intro"; cutscene banner 'WELCOME TO THE YARD — NEW FISH
  101'. Internal comments (ai.js/BustALead.jsx/Tutorial.jsx/sfx.js) updated for consistency.
- Cutscene KEY 'newbooty_intro' + asset basename 'g2_newbooty_intro' intentionally KEPT (file loading);
  only user-facing labels changed. Verified live: DOM has no 'New Booty'/'CDCR', subtitle + New Fish tier
  + page title all render correctly.
- KNOWN (not changed per instruction): the splash art splash2_bal.png has old "CDCR PRISON RULES" text
  baked into the image; left untouched (no static image edits). Regenerate the asset to update it.

## Updates (2026-06 — Request 22: BUG FIX — g2_teeth/g2_3bang firing on load/auction)
- ROOT CAUSE: g2_teeth & g2_3bang were members of the CutsceneManager's G2 ambient pool, so the
  generic requestFlair() rotation (fired on AI bids during the auction) could randomly select them
  BEFORE any card was played — the "cutscene on game start" bug.
- FIX (cutsceneManager.js): the ambient rotation now contains ONLY the AI opponents (PapaCap, Doolow;
  equal selection). G2's clips (g2_3bang, g2_hardset, g2_teeth) moved to a non-ambient G2_CLIPS list —
  tracked by charOfClip()/notePriority() for logging + anti-repeat but NEVER selectable by requestFlair.
  So G2 achievement cutscenes can no longer fire on load/auction.
- HARDENED (useGame.js completed-book effect) with strict lifecycle guards: (1) isInitialMount ref skips
  the mount run; (2) only phase==='play'; (3) only when a NEW trick actually resolved (book count
  advanced); (4) trick must contain played cards (plays.length>0). g2_teeth requires G2 to win WITH an
  Ace AND another player also played an Ace; g2_3bang requires G2 to win a trick with 3+ counters
  (A/10/K); Ace Catch prioritized over Three-Counter. These are the ONLY two requestCutscene('g2_*') sites.
- Verified: 14/14 jest pass; clean compile; live browser watch of a fresh match auction — only a Doolow
  ambient clip fired (banner override correct), ZERO g2_teeth/g2_3bang leak, zero console errors.

## Updates (2026-06 — Request 21: G2 signature achievement cutscenes bypass cooldown)
- Two G2 gameplay achievements now fire IMMEDIATELY (bypassing the CutsceneManager ambient cooldown/
  rotation) as full-screen CutsceneOverlay clips, detected in the completed-book effect in useGame.js:
  * g2_teeth ("Ace Catch") — G2 wins the book WITH an Ace AND at least one other player also played an
    Ace in that same book. (Previously a small inline avatar taunt; now full-screen 100vw/100vh.)
  * g2_3bang ("Three-Counter Take") — G2 wins a book containing 3+ counters (rank A / 10 / K).
- Both call requestCutscene(key) directly (immediate) then mgrRef.notePriority(key) so match-wide
  anti-repeat stays in sync; g2_teeth/g2_3bang added to CUTSCENE_TIER at tier 3 (priority). If neither
  achievement fires, the book falls back to the normal manager-governed requestFlair() opportunity.
  Guarded only against clobbering an already-open blocking cutscene/meld modal.
- Verified: 14/14 jest pass; compiles clean; smoke run reached settlement with 0 console errors and the
  CutsceneManager logging intact. (Achievement triggers are rare gameplay events; predicates are pure.)

## Updates (2026-06 — Request 20: Centralized CutsceneManager — PapaCap flood fix + character balancing)
- NEW src/game/cutsceneManager.js — single global gateway for all flair/personality cutscenes.
  * CHAR_POOLS: PapaCap [papacap_scene_1..4, papacap_set], Doolow [doolow_scene_takeover/cut/renege,
    doolow_set], G2 [g2_3bang, g2_hardset, g2_teeth]. charOfClip() maps a clip -> character.
  * requestFlair({trick,hand}): (1) GLOBAL cooldown = no cutscene within 3 tricks (GLOBAL_TRICK_COOLDOWN);
    (2) picks a random ELIGIBLE character FIRST (equal 1/3), then an unplayed clip from that pool;
    (3) per-character lockout of 2 full rounds/hands (CHAR_ROUND_LOCKOUT); (4) match-wide anti-repeat
    (played Set; resets a fresh cycle once every clip has played). Logs
    console.log('[CutsceneManager] Triggered: <clip> for <char>') on every trigger.
  * notePriority(key): critical/contextual cutscenes (game over/portal, renege, falseaccuse, tutorial,
    meld milestones, kitty prayer, sweep, contextual set-taunts) bypass cooldowns but are registered for
    anti-repeat + logged the same way. reset() called on RESET_TABLE (new match).
- useGame.js rewired: removed all scattered hardcoded papacap_scene/fireTaunt trigger sites. AI-bid,
  completed-book, and high-contract (trump phase) effects now each call requestFlair(state) (the sole
  gateway). Trick index = hand*25 + completedBooks.length. Removed the old per-hand flairUsedRef/
  lastFlairKeyRef/takeoverLastHandRef/snatchRef/papacapTsRef and the avatar fireTaunt bid/book taunts.
  requestCutscene() is now just the single-slot tier-arbitration display setter. Flair clips play
  full-screen with a generic character banner (CHAR_BANNER) via cutscene.data.banner (so a pooled
  settlement clip never shows its "got set" caption out of context). CutsceneOverlay banner honors
  cutscene.data.banner || BANNER[key].
- Verified: 14/14 jest pass; testing agent iteration_33.json 100% over 6 hands / ~150 tricks — character
  balance exactly 3/3/3 (PapaCap does NOT dominate), global 3-trick cooldown holds (no back-to-back
  flair), anti-repeat holds for flair, all cutscenes dismissible, no soft-lock, 0 uncaught console errors.

## Updates (2026-06 — Request 19: External feedback links)
- Added FEEDBACK_URL (https://forms.gle/j9aMWdxqwYjYWjzz5) links, both target="_blank"
  rel="noopener noreferrer" so the game session stays intact:
  * Main menu (ConfigScreen hero, bottom-right): small "Feedback" text link
    (data-testid feedback-link-menu).
  * Game Over (SettlementModal r.gameOver branch): prominent emerald secondary button
    "Give Feedback (2 Min) 📝" (data-testid feedback-btn-gameover) below the New Game button.
- Verified: compiles clean; menu link confirmed on-screen with correct href/target; Game Over
  button uses the identical anchor pattern.

## Updates (2026-06 — $140 Economy, Throw It In, Skillz Defensive AI, Cutscene Pools, Dedication)
- **$140 economy**: `START_BANKROLL`/`startingBankrolls()` in `constants.js`; reducer init/NEW_GAME/RESET_TABLE use it. Config label `starting-bankroll-label` "Starting Bankroll: $140.00 (CDCR Max Monthly Canteen Draw)"; HUD `bankroll-pill-P` tooltip + `canteen-tip` subtext "Max Monthly Draw: $140. Don't lose your canteen." Rules/New Game copy updated.
- **Multiplier badge**: `MultiplierBadge` (`multiplier-badge`) in header status capsule — "[ MULTIPLIER: Nx ]" desktop / "×N" mobile; compounding unchanged (Going Double ×2 · Lay-Down CHALLENGED ×2 · Spades ×2 → up to ×8). User chose to keep Lay-Down ×2 only when challenged.
- **Throw It In**: reducer `THROW_IN` (play phase, human bidder only) → result 'hard', conceded, thrownIn, label "Threw It In — Hard Set", −2×mult×stakes per defender. Header `throw-in-btn` (desktop icon cluster next to sound; mobile compact) → `ThrowInConfirmModal` (`throw-in-modal`, cancel/confirm) → `concession` cutscene. Verified in-browser end to end.
- **Skillz — Defensive AI** (new config section, independent of Difficulty): `settings.skill` = dumptruck 0.65 / alight 0.75 (default) / shooter 1.0 (`SKILL_RATING` in `ai.js`). `syndicatePlay()` = counter starvation, partner-void exploitation (`seatVoids(playLog)`), ace-hunting/book starvation; `aiPlay(..., ctx)` rolls against the rating per defender play; Dump Truck lapses into naive selfish play. `useGame.drive()` passes ctx {voids,bidderBooks,bench,skill}.
- **Cutscene pools**: `ROTATION_POOLS` + `mgr.rotate()` shuffle-bag (sweep, renege, hardset, portal, game_over) — every clip once per cycle, never back-to-back; `requestCutscene` attaches `data.clip`, `sourcesFor(key, clip)`. Ambient pools now DooLow (takeover/cut/renege/taunt_1/2) + PapaCap (scene_1-4/taunt_1/2). Generic hard sets (G2/DooLow/PapaCap) → `hardset` pool; Scrap/Baby Boy keep overrides. Dead keys removed (doolow_set, papacap_set, g2_hardset, doolow_bid, papacap_bid, papacap_bigbid, game_over_1/2 as keys). Widow Prayer strictly bid > 95.
- **Match over**: `humanWonMatch()` (P > 0 AND highest bankroll) → `portal` + portalHum; else `game_over` pool. Chopper easter egg SKIPPED per user (asset `get2_chopper.mp4` not uploaded).
- **Dedication & Origin modal** (`DedicationModal`, `dedication-modal`): auto-pops after the match-over cutscene ends (`matchOutroDone` from useGame.clearCutscene); also via `dedication-btn-title` (title screen) and `dedication-btn-rules` (Rulebook). Play Again → NEW_GAME; Visit Get2 Studios link. Chain-link watermark CSS `.chain-link`.
- **Mobile**: suit-column budget tightened (winH*0.42−52, min overlap 30, smaller suit glyph). No horizontal overflow at 390px.
- **Tests**: 24/24 Jest (`skillz.test.js` new: THROW_IN math, ×8 compounding, seatVoids, syndicate behaviours, legality across all skill tiers; `gameover.test.js` rewritten for portal/game_over + rotation).
- Testing agent timed out this iteration (no report file); flows self-verified via Playwright (config, dedication, deal, Throw It In full flow, mobile overflow check).

## Backlog
- P1: Upload `get2_chopper.mp4/.webm` and wire a `chopper` key (P ≤ $0) if desired.
- P2: Refactor `Modals.jsx` (>1300 lines) / `Table.jsx` / `ActionBar.jsx` (deferred to protect stability).
- Known false-positives: `useGame.js` hook deps and `storage.js` localStorage warnings — do NOT "fix".
