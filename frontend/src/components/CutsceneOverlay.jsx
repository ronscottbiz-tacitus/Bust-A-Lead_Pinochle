import { useEffect, useRef, useState } from 'react';
import { SkipForward } from 'lucide-react';
import { Card } from './Card';

// Key -> ordered asset basenames. First playable source wins; a missing file
// (SPA 404 -> text/html) is skipped by the browser, falling back to the next
// basename, then finally auto-dismissing so the game never blocks.
const FILE = {
  // Blocking (full-screen) — rare, major moments. Pooled keys (sweep / renege / hardset /
  // portal / game_over) receive their concrete clip from the CutsceneManager shuffle-bag via
  // cutscene.data.clip; the list here is only the safety fallback.
  renege: ['g2_renege_2', 'g2_renege', 'cutscene_renege_busted'],
  falseaccuse: ['papacap_taunt_2', 'cutscene_trashtalk_smirk'],
  sweep: ['g2_sweep', 'canteen_sweep'],
  portal: ['g2_portal_2', 'g2_portal'],
  game_over: ['game_over_1', 'game_over_2'],
  concession: ['cutscene_hand_concede'],
  aces1000: ['cutscene_1000_aces'],
  nuts90: ['cutscene_90_nuts'],
  kittyprayer: ['cutscene_kitty_prayer'],
  hardset: ['cutscene_hardset_canteen', 'break_yo_self'],
  // Ambient flair pools (DooLow / PapaCap) — rotated by the CutsceneManager.
  papacap_scene_1: ['papacap_scene_1'],
  papacap_scene_2: ['papacap_scene_2'],
  papacap_scene_3: ['papacap_scene_3'],
  papacap_scene_4: ['papacap_scene_4'],
  papacap_taunt_1: ['papacap_taunt_1'],
  papacap_taunt_2: ['papacap_taunt_2'],
  doolow_scene_takeover: ['doolow_scene_takeover'],
  doolow_scene_cut: ['doolow_scene_cut'],
  doolow_scene_renege: ['doolow_scene_renege'],
  doolow_taunt_1: ['doolow_taunt_1'],
  doolow_taunt_2: ['doolow_taunt_2'],
  // Earned signature moments + tutorial.
  g2_3bang: ['g2_3bang'],
  g2_teeth: ['g2_teeth'],
  newbooty_intro: ['g2_newbooty_intro'],
  renege_lesson: ['g2_renege_lesson'],
  // Character-specific cutscenes (Baby Boy / Scrap).
  babyboy_taunt: ['cutscene_babyboy_taunt'],
  babyboy_hardset: ['cutscene_babyboy_hardset'],
  scrap_slam: ['cutscene_scrap_slam'],
  scrap_hardset: ['cutscene_scrap_hardset'],
};

export function sourcesFor(key, clip) {
  const bases = clip ? [clip] : FILE[key] || [];
  return bases.flatMap((b) => [
    { src: `/assets/cutscenes/${b}.webm`, type: 'video/webm' },
    { src: `/assets/cutscenes/${b}.mp4`, type: 'video/mp4' },
  ]);
}

// Direct webm+mp4 sources for a raw asset basename (used by the Yard Reels gallery).
export function videoSources(basename) {
  return [
    { src: `/assets/cutscenes/${basename}.webm`, type: 'video/webm' },
    { src: `/assets/cutscenes/${basename}.mp4`, type: 'video/mp4' },
  ];
}

// The full cinematic library shown in the Yard Reels gallery modal.
export const CUTSCENE_LIBRARY = [
  { base: 'g2_portal_2', title: 'The Get-2 (Match Won)', tag: 'Cinematic' },
  { base: 'game_over_1', title: 'Match Outro I', tag: 'Cinematic Outro' },
  { base: 'game_over_2', title: 'Match Outro II', tag: 'Cinematic Outro' },
  { base: 'g2_sweep', title: 'The Canteen Sweep', tag: 'Cinematic' },
  { base: 'g2_renege_2', title: 'Renege Busted', tag: 'Cinematic' },
  { base: 'cutscene_hardset_canteen', title: 'Hard Set — Canteen', tag: 'Cinematic' },
  { base: 'g2_newbooty_intro', title: 'New Fish Intro', tag: 'Tutorial' },
  { base: 'g2_renege_lesson', title: 'Renege Lesson', tag: 'Tutorial' },
  { base: 'doolow_scene_takeover', title: 'DooLow — Takeover', tag: 'Cinematic' },
  { base: 'doolow_scene_cut', title: 'DooLow — The Cut', tag: 'Cinematic' },
  { base: 'doolow_scene_renege', title: 'DooLow — Renege Catch', tag: 'Cinematic' },
  { base: 'break_yo_self', title: 'Break Yo Self', tag: 'Cinematic' },
  { base: 'canteen_sweep', title: 'Canteen Sweep (Classic)', tag: 'Cinematic' },
  { base: 'cutscene_hand_concede', title: 'Hand Conceded', tag: 'Cinematic' },
  { base: 'cutscene_renege_busted', title: 'Renege (Classic)', tag: 'Cinematic' },
  { base: 'cutscene_kitty_prayer', title: 'The Widow Prayer', tag: 'Cinematic' },
  { base: 'cutscene_1000_aces', title: '1,000 Aces', tag: 'Cinematic' },
  { base: 'cutscene_90_nuts', title: '90 Nutz', tag: 'Cinematic' },
  { base: 'cutscene_trashtalk_smirk', title: 'Trash Talk', tag: 'Cinematic' },
  { base: 'doolow_taunt_1', title: 'DooLow — Taunt I', tag: 'Taunt' },
  { base: 'doolow_taunt_2', title: 'DooLow — Taunt II', tag: 'Taunt' },
  { base: 'papacap_taunt_1', title: 'PapaCap — Taunt I', tag: 'Taunt' },
  { base: 'papacap_taunt_2', title: 'PapaCap — Taunt II', tag: 'Taunt' },
  { base: 'papacap_scene_1', title: 'PapaCap — Scene I', tag: 'Taunt' },
  { base: 'papacap_scene_2', title: 'PapaCap — Scene II', tag: 'Taunt' },
  { base: 'papacap_scene_3', title: 'PapaCap — Scene III', tag: 'Taunt' },
  { base: 'papacap_scene_4', title: 'PapaCap — Scene IV', tag: 'Taunt' },
  { base: 'g2_teeth', title: 'Snatchin\u2019 Teeth', tag: 'Taunt' },
  { base: 'g2_3bang', title: 'G2 — 3 Bang', tag: 'Taunt' },
  { base: 'cutscene_babyboy_taunt', title: 'Baby Boy — Too Smooth', tag: 'Taunt' },
  { base: 'cutscene_babyboy_hardset', title: 'Baby Boy — Got Set', tag: 'Cinematic' },
  { base: 'cutscene_scrap_slam', title: 'Scrap — Concrete Slam', tag: 'Taunt' },
  { base: 'cutscene_scrap_hardset', title: 'Scrap — Got Set', tag: 'Cinematic' },
  { base: 'cutscene_title_loop', title: 'Title Loop', tag: 'Ambient' },
];

const BANNER = {
  renege: "RENEGE! CAUGHT SLIPPIN' IN THE YARD",
  falseaccuse: "PAPACAP: \u201CTHAT ALL YOU GOT?\u201D",
  sweep: 'THE CANTEEN SWEEP — CONTRACT MADE',
  portal: 'THE GET 2 — MATCH WON',
  game_over: 'MATCH OVER — THE YARD COLLECTS',
  concession: 'HAND CONCEDED',
  aces1000: '1,000 ACES — LEGEND DROP',
  nuts90: '90 NUTZ! TRIPLE PINOCHLE',
  kittyprayer: 'THE WIDOW PRAYER — FLIPPIN\u2019 THE KITTY',
  hardset: 'HARD SET — CANTEEN WIPED OUT',
  g2_3bang: 'G2 — 3 BANG! COUNTERS SNATCHED',
  g2_teeth: "G2 — SNATCHIN' TEETH",
  papacap_scene_1: "PAPACAP TALKIN' NOISE",
  papacap_scene_2: "PAPACAP TALKIN' NOISE",
  papacap_scene_3: "PAPACAP TALKIN' NOISE",
  papacap_scene_4: "PAPACAP TALKIN' NOISE",
  papacap_taunt_1: "PAPACAP TALKIN' NOISE",
  papacap_taunt_2: "PAPACAP TALKIN' NOISE",
  newbooty_intro: 'WELCOME TO THE YARD — NEW FISH 101',
  renege_lesson: 'RENEGE 101 — KNOW THE PENALTY',
  doolow_scene_takeover: 'DOOLOW SEIZES THE CONTRACT',
  doolow_scene_cut: 'DOOLOW CUTS — COUNTERS SNATCHED',
  doolow_scene_renege: 'DOOLOW CATCHES THE RENEGE',
  doolow_taunt_1: "DOOLOW RUNNIN' HIS MOUTH",
  doolow_taunt_2: "DOOLOW RUNNIN' HIS MOUTH",
  babyboy_taunt: "BABY BOY: \u201CTOO SMOOTH, HOMEY\u201D",
  babyboy_hardset: 'BABY BOY GOT SET — SMOOTH RUNS OUT',
  scrap_slam: 'SCRAP SLAMS THE TRUMP — CONCRETE',
  scrap_hardset: 'SCRAP GOT SET — THE WALL CRACKS',
};

// Full-screen blocking cinematic. UNMUTED so the clip's native audio plays (SFX/voice
// live inside the MP4/WebM containers). playsInline so mobile never full-screens it;
// auto-dismisses on end / error / stall / cap so the game NEVER freezes.
export function CutsceneOverlay({ cutscene, onDone, muted = false }) {
  const key = cutscene?.key || null;
  const doneRef = useRef(false);
  const startedRef = useRef(false);
  const loadTimer = useRef(null);
  const [failed, setFailed] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(loadTimer.current);
    onDone?.();
  };

  useEffect(() => {
    if (!key) return;
    doneRef.current = false;
    startedRef.current = false;
    setFailed(false);
    // No hard cap — the clip plays to its natural end (onEnded) or until the user taps Skip.
    // The only guard is a short load timer that dismisses if playback never starts (missing asset).
    loadTimer.current = setTimeout(() => {
      if (!startedRef.current) finish();
    }, 2500);
    return () => {
      clearTimeout(loadTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || failed) return null;
  const replay = key === 'renege' && cutscene?.data?.card;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center animate-[fadeIn_0.2s_ease]"
      data-testid={`cutscene-${key}`}
      onClick={finish}
    >
      {/* Dark vignette backdrop behind the centered cinematic. */}
      <div className="absolute inset-0 bg-black/85" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.94) 100%)' }} />
      <video
        key={cutscene?.data?.clip || key}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        onPlaying={() => {
          startedRef.current = true;
        }}
        onEnded={finish}
        onError={() => {
          setFailed(true);
          finish();
        }}
        onStalled={() => {
          if (!startedRef.current) finish();
        }}
        className="relative w-full h-full max-w-[100vw] max-h-[100vh] object-contain"
      >
        {sourcesFor(key, cutscene?.data?.clip).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      <div
        data-testid="cutscene-banner"
        className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/70 border border-amber-500/50 text-amber-300 text-sm sm:text-base font-display font-black tracking-wide backdrop-blur text-center max-w-[92vw]"
      >
        {cutscene?.data?.banner || BANNER[key] || ''}
      </div>
      {replay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" data-testid="renege-replay">
          <div className="text-rose-400 font-display font-black text-xs sm:text-sm uppercase tracking-[0.3em] mb-3 animate-pulse">▶ Instant Replay</div>
          <div className="renege-replay">
            <div className="renege-ring rounded-xl">
              <Card card={cutscene.data.card} size="lg" />
            </div>
          </div>
          <div className="mt-5 px-5 py-2 rounded-full bg-rose-950/80 border-2 border-rose-500/70 text-rose-200 font-display font-black text-sm sm:text-lg uppercase tracking-wide text-center max-w-[92vw]">
            {cutscene.data.reason || 'Illegal Card'}
          </div>
        </div>
      )}
      <button
        data-testid="cutscene-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-display font-bold tracking-wide flex items-center gap-2 backdrop-blur transition-colors active:scale-95"
      >
        Skip <SkipForward size={16} />
      </button>
    </div>
  );
}

// Shared auto-dismiss timer logic for the non-blocking taunt clips.
function useTauntTimers(active, onDone) {
  const doneRef = useRef(false);
  const startedRef = useRef(false);
  const load = useRef(null);
  const [failed, setFailed] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(load.current);
    onDone?.();
  };

  useEffect(() => {
    if (!active) return undefined;
    doneRef.current = false;
    startedRef.current = false;
    setFailed(false);
    // Play to the clip's natural end; only dismiss early if playback never starts (missing asset).
    load.current = setTimeout(() => {
      if (!startedRef.current) finish();
    }, 2000);
    return () => {
      clearTimeout(load.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { failed, startedRef, finish };
}

// Non-blocking reaction clip rendered INSIDE an opponent's avatar portrait frame.
// Fills the rounded frame (object-cover). Unmuted so the clip's own audio plays.
export function AvatarTaunt({ taunt, seat, onDone }) {
  const active = taunt && taunt.seat === seat ? taunt.key : null;
  const { failed, startedRef, finish } = useTauntTimers(active, onDone);
  if (!active || failed) return null;
  return (
    <div
      data-testid={`avatar-taunt-${seat}`}
      className="absolute inset-0 z-30 rounded-2xl overflow-hidden animate-[fadeIn_0.15s_ease]"
    >
      <video
        key={active}
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={() => {
          startedRef.current = true;
        }}
        onEnded={finish}
        onError={finish}
        onStalled={() => {
          if (!startedRef.current) finish();
        }}
        className="w-full h-full object-cover"
      >
        {sourcesFor(active).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
    </div>
  );
}

// Non-blocking, transparent, centered reaction clip (used for G2's own celebratory
// taunts). No corner box, no border — a clean overlay that does not pause the game.
export function TauntOverlay({ taunt, seats = ['P'], onDone }) {
  const active = taunt && seats.includes(taunt.seat) ? taunt.key : null;
  const { failed, startedRef, finish } = useTauntTimers(active, onDone);
  if (!active || failed) return null;
  return (
    <div
      data-testid={`taunt-overlay-${taunt.seat}`}
      className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none animate-[fadeIn_0.15s_ease]"
    >
      <video
        key={active}
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={() => {
          startedRef.current = true;
        }}
        onEnded={finish}
        onError={finish}
        onStalled={() => {
          if (!startedRef.current) finish();
        }}
        className="w-[62vw] max-w-md h-auto max-h-[60vh] object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
      >
        {sourcesFor(active).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
    </div>
  );
}

// Looping, muted title video behind the config / splash screen.
export function TitleVideo() {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      onError={() => setOk(false)}
      data-testid="title-cutscene"
      className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60"
    >
      <source src="/assets/cutscenes/cutscene_title_loop.webm" type="video/webm" />
      <source src="/assets/cutscenes/cutscene_title_loop.mp4" type="video/mp4" />
    </video>
  );
}
