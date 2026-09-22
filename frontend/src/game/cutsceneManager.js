// Centralized cutscene rotation + cooldown manager.
// Keeps AI-opponent taunts balanced (equal selection), throttled (global 3-trick
// cooldown + per-character 2-round lockout) and non-repeating within a single match.
// Also owns the anti-repeat "shuffle-bag" pools used by settlement / match-over clips.
//
// IMPORTANT: only the AI opponents (PapaCap, Doolow) participate in the ambient rotation.
// G2's cutscenes are EARNED — g2_teeth / g2_3bang fire ONLY on their specific trick
// achievements. They are NEVER selectable by requestFlair.

export const CHAR_POOLS = {
  PapaCap: ['papacap_scene_1', 'papacap_scene_2', 'papacap_scene_3', 'papacap_scene_4', 'papacap_taunt_1', 'papacap_taunt_2'],
  Doolow: ['doolow_scene_takeover', 'doolow_scene_cut', 'doolow_scene_renege', 'doolow_taunt_1', 'doolow_taunt_2'],
};

// Shuffle-bag rotation pools (asset basenames) for logical settlement keys.
export const ROTATION_POOLS = {
  sweep: ['g2_sweep', 'canteen_sweep'],
  renege: ['g2_renege_2', 'g2_renege', 'cutscene_renege_busted'],
  hardset: ['cutscene_hardset_canteen', 'break_yo_self'],
  portal: ['g2_portal_2', 'g2_portal'],
  game_over: ['game_over_1', 'game_over_2'],
};

// G2 clips — logged + tracked for anti-repeat, but excluded from the ambient rotation.
const G2_CLIPS = ['g2_3bang', 'g2_teeth'];

const CHARS = Object.keys(CHAR_POOLS); // ambient rotation participants (PapaCap + Doolow)
const AMBIENT_CLIPS = CHARS.flatMap((c) => CHAR_POOLS[c]);

export const charOfClip = (clip) => {
  const c = CHARS.find((k) => CHAR_POOLS[k].includes(clip));
  if (c) return c;
  return G2_CLIPS.includes(clip) ? 'G2' : null;
};

const GLOBAL_TRICK_COOLDOWN = 3; // no ambient cutscene more than once per 3 tricks
const CHAR_ROUND_LOCKOUT = 2; // a character is locked out for the next 2 full rounds (hands)

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function createCutsceneManager() {
  let lastTrick = -Infinity; // global trick index of the last ambient cutscene
  let charUnlock = { PapaCap: 0, Doolow: 0 }; // hand index each character is free again
  let played = new Set(); // clips already played this match (anti-repeat)
  let bags = {}; // pool -> remaining shuffled clips
  let lastDrawn = {}; // pool -> last clip drawn (never repeated back-to-back)

  const reset = () => {
    lastTrick = -Infinity;
    charUnlock = { PapaCap: 0, Doolow: 0 };
    played = new Set();
    bags = {};
    lastDrawn = {};
  };

  const log = (clip, character) =>
    // eslint-disable-next-line no-console
    console.log(`[CutsceneManager] Triggered: ${clip} for ${character}`);

  // Shuffle-bag draw: every clip in the pool plays once before any repeats, and a refilled
  // bag never opens with the clip that just played. Returns an asset basename.
  const rotate = (pool) => {
    const clips = ROTATION_POOLS[pool];
    if (!clips) return null;
    if (!bags[pool] || bags[pool].length === 0) {
      let bag = shuffle(clips);
      if (clips.length > 1 && bag[0] === lastDrawn[pool]) bag = [...bag.slice(1), bag[0]];
      bags[pool] = bag;
    }
    const clip = bags[pool].shift();
    lastDrawn[pool] = clip;
    log(clip, `POOL:${pool}`);
    return clip;
  };

  // Critical/contextual/earned cutscene fired outside the ambient rotation (settlement,
  // tutorial, meld milestones, G2 achievements). We record it for anti-repeat + log.
  const notePriority = (key) => {
    if (charOfClip(key)) played.add(key);
    log(key, charOfClip(key) || 'CRITICAL');
  };

  // Request an ambient (AI-opponent) flair cutscene. Returns a clipId to play, or null.
  // trick = monotonic trick index across the match; hand = hands-played index;
  // seated = manager-key character names currently seated as opponents (only these can taunt).
  const requestFlair = ({ trick, hand, seated }) => {
    // 1) Global cooldown — at most one ambient cutscene every N tricks.
    if (trick - lastTrick < GLOBAL_TRICK_COOLDOWN) return null;

    // Anti-repeat — once every ambient clip has played, start a fresh cycle.
    if (AMBIENT_CLIPS.every((c) => played.has(c))) played = new Set();

    // 2/3) Eligible characters: seated as an opponent, not locked out, holding an unplayed clip.
    const eligible = CHARS.filter(
      (c) =>
        (!seated || seated.includes(c)) &&
        hand >= charUnlock[c] &&
        CHAR_POOLS[c].some((clip) => !played.has(clip))
    );
    if (eligible.length === 0) return null;

    // Equal character selection FIRST, then an unplayed clip from that character's pool.
    const character = pick(eligible);
    const clip = pick(CHAR_POOLS[character].filter((c) => !played.has(c)));

    // Commit cooldowns + anti-repeat + log.
    played.add(clip);
    lastTrick = trick;
    charUnlock[character] = hand + CHAR_ROUND_LOCKOUT;
    log(clip, character);
    return clip;
  };

  return { reset, requestFlair, notePriority, rotate };
}
