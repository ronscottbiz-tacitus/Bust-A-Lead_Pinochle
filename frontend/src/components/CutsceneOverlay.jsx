import { useEffect, useRef, useState } from 'react';
import { SkipForward } from 'lucide-react';
import { Card } from './Card';

// Map internal cutscene keys -> optimized assets under /assets/cutscenes/.
// WebM (VP9) is listed first so open-source Chromium (which lacks proprietary
// H.264) can play it; the H.264 MP4 is the fallback for Safari / older browsers.
const CUTSCENE_FILE = {
  renege: 'cutscene_renege_busted',
  hardset: 'cutscene_hardset_canteen',
  concession: 'cutscene_hand_concede',
  trashtalk: 'cutscene_trashtalk_smirk',
};
// Auto-dismiss caps (ms) per the spec.
const CUTSCENE_CAP = { renege: 5000, hardset: 5000, concession: 4500, trashtalk: 4500 };
const CUTSCENE_BANNER = {
  renege: "RENEGE! CAUGHT SLIPPIN' IN THE YARD",
  hardset: 'HARD SET — CANTEEN WIPED OUT',
  concession: 'HAND CONCEDED',
  trashtalk: "PAPACAP: \u201CTHAT ALL YOU GOT?\u201D",
};

// Full-screen cinematic overlay for a single game event. Muted + playsInline so
// autoplay is never blocked; the game plays its own SFX cue alongside. If the
// clip is missing / errors / stalls / is slow, the overlay auto-dismisses so the
// game NEVER freezes.
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
    capTimer.current = setTimeout(finish, CUTSCENE_CAP[key] || 5000);
    // Load guard: bail fast if playback hasn't begun (missing / slow file).
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
  const base = `/assets/cutscenes/${CUTSCENE_FILE[key]}`;
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
        <source src={`${base}.webm`} type="video/webm" />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
      <div
        data-testid="cutscene-banner"
        className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/70 border border-amber-500/50 text-amber-300 text-sm sm:text-base font-display font-black tracking-wide backdrop-blur text-center max-w-[92vw]"
      >
        {CUTSCENE_BANNER[key]}
      </div>

      {replay && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          data-testid="renege-replay"
        >
          <div className="text-rose-400 font-display font-black text-xs sm:text-sm uppercase tracking-[0.3em] mb-3 animate-pulse">
            ▶ Instant Replay
          </div>
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

// Looping, muted title video that sits behind the config / splash screen.
// Silently removes itself if the file cannot be played.
export function TitleVideo() {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      onError={() => setOk(false)}
      data-testid="title-cutscene"
      className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60"
    >
      <source src="/assets/cutscenes/cutscene_title_loop.webm" type="video/webm" />
      <source src="/assets/cutscenes/cutscene_title_loop.mp4" type="video/mp4" />
    </video>
  );
}
