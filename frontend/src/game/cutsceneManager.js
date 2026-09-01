// Centralized cutscene rotation + cooldown manager.
// Keeps character taunts balanced (equal 1/3 selection), throttled (global 3-trick
// cooldown + per-character 2-round lockout) and non-repeating within a single match.
// ALL flair/personality cutscene requests must route through requestFlair(); critical
// event cutscenes (game over / renege / tutorial) call notePriority() so the anti-repeat
// rotation stays in sync and everything is logged the same way.

export const CHAR_POOLS = {
  PapaCap: ['papacap_scene_1', 'papacap_scene_2', 'papacap_scene_3', 'papacap_scene_4', 'papacap_set'],
  Doolow: ['doolow_scene_takeover', 'doolow_scene_cut', 'doolow_scene_renege', 'doolow_set'],
  G2: ['g2_3bang', 'g2_hardset', 'g2_teeth'],
};

const CHARS = Object.keys(CHAR_POOLS);
const ALL_CLIPS = CHARS.flatMap((c) => CHAR_POOLS[c]);

export const charOfClip = (clip) => CHARS.find((c) => CHAR_POOLS[c].includes(clip)) || null;

const GLOBAL_TRICK_COOLDOWN = 3; // no cutscene of any kind more than once per 3 tricks
const CHAR_ROUND_LOCKOUT = 2; // a character is locked out for the next 2 full rounds (hands)

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createCutsceneManager() {
  let lastTrick = -Infinity; // global trick index of the last cutscene
  let charUnlock = { PapaCap: 0, Doolow: 0, G2: 0 }; // hand index each character is free again
  let played = new Set(); // clips already played this match (anti-repeat)

  const reset = () => {
    lastTrick = -Infinity;
    charUnlock = { PapaCap: 0, Doolow: 0, G2: 0 };
    played = new Set();
  };

  const log = (clip, character) =>
    // eslint-disable-next-line no-console
    console.log(`[CutsceneManager] Triggered: ${clip} for ${character}`);

  // Critical/contextual cutscene fired outside the flair rotation (settlement, tutorial,
  // meld milestones). Always allowed by the caller; we just record it for anti-repeat + log.
  const notePriority = (key) => {
    if (charOfClip(key)) played.add(key);
    log(key, charOfClip(key) || 'CRITICAL');
  };

  // Request a flair (personality) cutscene. Returns a clipId to play, or null if throttled.
  // trick = monotonic trick index across the match; hand = hands-played index.
  const requestFlair = ({ trick, hand }) => {
    // 1) Global cooldown — at most one cutscene every N tricks.
    if (trick - lastTrick < GLOBAL_TRICK_COOLDOWN) return null;

    // Anti-repeat — once every clip has played, start a fresh cycle.
    if (ALL_CLIPS.every((c) => played.has(c))) played = new Set();

    // 2/3) Eligible characters: not locked out AND still holding an unplayed clip.
    const eligible = CHARS.filter(
      (c) => hand >= charUnlock[c] && CHAR_POOLS[c].some((clip) => !played.has(clip))
    );
    if (eligible.length === 0) return null;

    // Equal 1/3 character selection FIRST, then an unplayed clip from that character's pool.
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
