// Centralized cutscene rotation + cooldown manager.
// Keeps AI-opponent taunts balanced (equal selection), throttled (global 3-trick
// cooldown + per-character 2-round lockout) and non-repeating within a single match.
//
// IMPORTANT: only the AI opponents (PapaCap, Doolow) participate in the ambient rotation.
// G2's cutscenes are EARNED — g2_teeth / g2_3bang fire ONLY on their specific trick
// achievements and g2_hardset only at settlement. They are NEVER selectable by requestFlair,
// so they can never fire on load / during the auction.

export const CHAR_POOLS = {
  PapaCap: ['papacap_scene_1', 'papacap_scene_2', 'papacap_scene_3', 'papacap_scene_4', 'papacap_set'],
  Doolow: ['doolow_scene_takeover', 'doolow_scene_cut', 'doolow_scene_renege', 'doolow_set'],
};

// G2 clips — logged + tracked for anti-repeat, but excluded from the ambient rotation.
const G2_CLIPS = ['g2_3bang', 'g2_hardset', 'g2_teeth'];

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

export function createCutsceneManager() {
  let lastTrick = -Infinity; // global trick index of the last ambient cutscene
  let charUnlock = { PapaCap: 0, Doolow: 0 }; // hand index each character is free again
  let played = new Set(); // clips already played this match (anti-repeat)

  const reset = () => {
    lastTrick = -Infinity;
    charUnlock = { PapaCap: 0, Doolow: 0 };
    played = new Set();
  };

  const log = (clip, character) =>
    // eslint-disable-next-line no-console
    console.log(`[CutsceneManager] Triggered: ${clip} for ${character}`);

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

  return { reset, requestFlair, notePriority };
}
