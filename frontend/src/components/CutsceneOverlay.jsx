import { useEffect, useRef, useState } from 'react';
import { SkipForward } from 'lucide-react';
import { Card } from './Card';

// Key -> ordered asset basenames. First playable source wins; a missing file
// (SPA 404 -> text/html) is skipped by the browser, falling back to the next
// basename, then finally auto-dismissing so the game never blocks.
const FILE = {
  // Blocking (full-screen) — rare, major moments.
  doolow_set: ['doolow_taunt_1'],
  papacap_set: ['doolow_taunt_2'],
  g2_hardset: ['papacap_taunt_2'],
  renege: ['g2_renege', 'cutscene_renege_busted'],
  falseaccuse: ['papacap_taunt_2', 'cutscene_trashtalk_smirk'],
  sweep: ['g2_sweep', 'canteen_sweep'],
  portal: ['g2_portal'],
  concession: ['cutscene_hand_concede'],
  aces1000: ['cutscene_1000_aces'],
  nuts90: ['cutscene_90_nuts'],
  kittyprayer: ['cutscene_kitty_prayer'],
  chopper: ['get2_chopper'],
  hardset: ['cutscene_hardset_canteen'],
  // Non-blocking taunt layer — frequent events.
  doolow_bid: ['doolow_taunt_2'],
  papacap_bid: ['papacap_taunt_1'],
  papacap_bigbid: ['papacap_taunt_2'],
  g2_3bang: ['g2_3bang'],
  g2_teeth: ['g2_teeth'],
};

export function sourcesFor(key) {
  return (FILE[key] || []).flatMap((b) => [
    { src: `/assets/cutscenes/${b}.webm`, type: 'video/webm' },
    { src: `/assets/cutscenes/${b}.mp4`, type: 'video/mp4' },
  ]);
}

const CAP = {
  renege: 5000, concession: 4500, sweep: 5000, portal: 6000,
  aces1000: 5000, nuts90: 5000, kittyprayer: 5000, chopper: 5000,
};
const BANNER = {
  doolow_set: "DOOLOW GOT SET — TALKIN' NOISE ANYWAY",
  papacap_set: 'SOMEBODY GOT SET IN THE YARD',
  g2_hardset: "PAPACAP: \u201CBROUGHT THAT ASS TO THE GRINDER\u201D",
  renege: "RENEGE! CAUGHT SLIPPIN' IN THE YARD",
  falseaccuse: "PAPACAP: \u201CTHAT ALL YOU GOT?\u201D",
  sweep: 'THE CANTEEN SWEEP — G2 CASHES OUT',
  portal: 'THE GET 2 — MATCH WON',
  concession: 'HAND CONCEDED',
  aces1000: '1,000 ACES — LEGEND DROP',
  nuts90: '90 NUTZ! TRIPLE PINOCHLE',
  kittyprayer: 'THE WIDOW PRAYER — FLIPPIN\u2019 THE KITTY',
  chopper: 'THE GET2 EXTRACTION',
  hardset: 'HARD SET — CANTEEN WIPED OUT',
};

// Full-screen blocking cinematic. Muted+playsInline so autoplay is never blocked;
// auto-dismisses on end / error / stall / cap so the game NEVER freezes.
export function CutsceneOverlay({ cutscene, onDone }) {
  const key = cutscene?.key || null;
  const doneRef = useRef(false);
  const startedRef = useRef(false);
  const capTimer = useRef(null);
  const loadTimer = useRef(null);
  const [failed, setFailed] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(capTimer.current);
    clearTimeout(loadTimer.current);
    onDone?.();
  };

  useEffect(() => {
    if (!key) return;
    doneRef.current = false;
    startedRef.current = false;
    setFailed(false);
    capTimer.current = setTimeout(finish, CAP[key] || 5000);
    loadTimer.current = setTimeout(() => {
      if (!startedRef.current) finish();
    }, 2000);
    return () => {
      clearTimeout(capTimer.current);
      clearTimeout(loadTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || failed) return null;
  const replay = key === 'renege' && cutscene?.data?.card;

  return (
    <div
      className="fixed inset-0 z-[130] bg-black flex items-center justify-center animate-[fadeIn_0.2s_ease]"
      data-testid={`cutscene-${key}`}
      onClick={finish}
    >
      <video
        key={key}
        autoPlay
        muted
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
        className="w-full h-full object-contain"
      >
        {sourcesFor(key).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      <div
        data-testid="cutscene-banner"
        className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/70 border border-amber-500/50 text-amber-300 text-sm sm:text-base font-display font-black tracking-wide backdrop-blur text-center max-w-[92vw]"
      >
        {BANNER[key] || ''}
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

// Compact NON-BLOCKING taunt clip (does not pause game logic). Auto-dismisses
// on end/error/stall/cap; missing files vanish instantly.
export function TauntLayer({ taunt, onDone }) {
  const key = taunt?.key || null;
  const doneRef = useRef(false);
  const startedRef = useRef(false);
  const cap = useRef(null);
  const load = useRef(null);
  const [failed, setFailed] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(cap.current);
    clearTimeout(load.current);
    onDone?.();
  };

  useEffect(() => {
    if (!key) return;
    doneRef.current = false;
    startedRef.current = false;
    setFailed(false);
    cap.current = setTimeout(finish, 3200);
    load.current = setTimeout(() => {
      if (!startedRef.current) finish();
    }, 1500);
    return () => {
      clearTimeout(cap.current);
      clearTimeout(load.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || failed) return null;

  return (
    <div
      data-testid={`taunt-${key}`}
      className="fixed bottom-24 left-3 z-[120] w-40 sm:w-52 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-2xl pointer-events-none animate-[fadeIn_0.2s_ease]"
    >
      <video
        key={key}
        autoPlay
        muted
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
        className="w-full h-auto"
      >
        {sourcesFor(key).map((s) => (
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
