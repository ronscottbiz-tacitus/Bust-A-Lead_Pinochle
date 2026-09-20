// Unified character registry for Bus' a Lead. The core engine stays seat-based
// (W / E / P); this layer maps each seat to a character identity (name, moniker,
// avatar), an AI behaviour profile, and character-specific cutscene keys.
//
// aiProfile:
//   aggression      0..1  -> bid boldness (higher = pushes contracts harder)
//   concessionRate  0..1  -> chance a weak bidder folds before Book 1
//   renegeDetection 0..1  -> chance this seat catches an opponent's renege

export const CHARACTERS = {
  g2: {
    id: 'g2',
    name: 'G2',
    moniker: 'The Architect',
    blurb: 'Calm, calculating, plays the long game.',
    avatar: '/assets/avatars/avatar_g2.png',
    aiProfile: { aggression: 0.65, concessionRate: 0.75, renegeDetection: 0.9 },
    cutscenes: { hardSet: 'g2_hardset', win: 'sweep', taunt: 'g2_3bang', elimination: 'hardset', clutchWin: 'sweep' },
  },
  babyboy: {
    id: 'babyboy',
    name: 'Baby Boy',
    moniker: 'The Smooth Hustler',
    blurb: 'High aggression, all flash — folds when the yard turns.',
    avatar: '/assets/avatars/avatar_babyboy.png',
    aiProfile: { aggression: 0.85, concessionRate: 0.6, renegeDetection: 0.6 },
    cutscenes: { hardSet: 'babyboy_hardset', win: 'babyboy_taunt', taunt: 'babyboy_taunt' },
  },
  scrap: {
    id: 'scrap',
    name: 'Scrap',
    moniker: 'The Concrete Enforcer',
    blurb: 'Tight, relentless. Never folds. Catches every renege.',
    avatar: '/assets/avatars/avatar_scrap.png',
    aiProfile: { aggression: 0.35, concessionRate: 0.0, renegeDetection: 1.0 },
    cutscenes: { hardSet: 'scrap_hardset', win: 'scrap_slam', taunt: 'scrap_slam' },
  },
  doolow: {
    id: 'doolow',
    name: 'DooLow',
    moniker: 'The Tactician',
    blurb: 'Balanced, mathematical, cuts his losses.',
    avatar: '/assets/avatars/avatar_doolow.png',
    aiProfile: { aggression: 0.65, concessionRate: 0.75, renegeDetection: 0.6 },
    cutscenes: { hardSet: 'doolow_set' },
  },
  papacap: {
    id: 'papacap',
    name: 'PapaCap',
    moniker: 'The Stubborn OG',
    blurb: 'Loose-aggressive OG who rides every contract out.',
    avatar: '/assets/avatars/avatar_papacap.png',
    aiProfile: { aggression: 0.75, concessionRate: 0.35, renegeDetection: 0.4 },
    cutscenes: { hardSet: 'papacap_set' },
  },
};

// Characters the human can pick as their own seat.
export const PLAYER_PICKS = ['g2', 'babyboy', 'scrap'];

// Default seat assignment: human = G2, opponents = DooLow (left/W) + PapaCap (right/E).
export const DEFAULT_SEAT_CHARS = { W: 'doolow', E: 'papacap', P: 'g2' };

export const getChar = (id) => CHARACTERS[id] || CHARACTERS.g2;

// Build the full seat roster from the human's pick. At least one AI opponent is always
// a hustler (Scrap / G2 / Baby Boy — one of the two the human didn't pick); the other is
// an OG (DooLow or PapaCap). Deterministic per pick so seats never reshuffle mid-render.
const OPPONENTS = {
  g2: { W: 'scrap', E: 'doolow' },
  babyboy: { W: 'scrap', E: 'papacap' },
  scrap: { W: 'babyboy', E: 'doolow' },
};

export function seatCharsFromPlayer(playerChar = 'g2') {
  const pick = CHARACTERS[playerChar] ? playerChar : 'g2';
  const opp = OPPONENTS[pick] || OPPONENTS.g2;
  return { P: pick, W: opp.W, E: opp.E };
}

// Full roster honoring hand-picked opponents (oppW / oppE). Any unset/invalid choice falls
// back to the auto pairing; duplicates (with the human's pick or each other) are resolved so
// the three seats are always distinct characters.
export const ROSTER_IDS = Object.keys(CHARACTERS);

export function buildSeatChars(playerChar = 'g2', oppW = null, oppE = null) {
  const pick = CHARACTERS[playerChar] ? playerChar : 'g2';
  const auto = OPPONENTS[pick] || OPPONENTS.g2;
  const valid = (id) => id && id !== pick && CHARACTERS[id];
  let W = valid(oppW) ? oppW : auto.W;
  let E = valid(oppE) ? oppE : auto.E;
  const pool = ROSTER_IDS.filter((id) => id !== pick);
  if (W === pick || !CHARACTERS[W]) W = pool[0];
  if (E === W || E === pick || !CHARACTERS[E]) E = pool.find((id) => id !== W) || auto.E;
  return { P: pick, W, E };
}
