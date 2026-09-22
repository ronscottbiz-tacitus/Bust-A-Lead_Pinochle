import { settlementCutscene, humanWonMatch } from '../../hooks/useGame';
import { createCutsceneManager, ROTATION_POOLS } from '../cutsceneManager';

// Match over resolves to a Tier-1 outcome: the Get-2 portal when the human finishes on top,
// otherwise the game_over outro rotation (elimination or another seat holding more canteen).
test('match over: portal on a human victory, game_over rotation otherwise', () => {
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 0, W: 100, E: 50 } }).key).toBe('game_over');
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 180, W: 0, E: 120 } }).key).toBe('portal');
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 60, W: 0, E: 240 } }).key).toBe('game_over');
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 0, W: 0, E: 0 } }).key).toBe('game_over');
  expect(settlementCutscene({ gameOver: true }).key).toBe('game_over');
  expect(humanWonMatch({ bankrolls: { P: 150, W: 150, E: 0 } })).toBe(true);
});

test('Throw It In / concessions resolve to the concession cutscene', () => {
  expect(settlementCutscene({ result: 'hard', conceded: true, thrownIn: true }).key).toBe('concession');
  expect(settlementCutscene({ result: 'soft' }).key).toBe('concession');
});

test('shuffle-bag rotation: every clip plays once per cycle and never repeats back-to-back', () => {
  const mgr = createCutsceneManager();
  for (const pool of Object.keys(ROTATION_POOLS)) {
    const clips = ROTATION_POOLS[pool];
    const draws = Array.from({ length: clips.length * 6 }, () => mgr.rotate(pool));
    for (let i = 0; i < draws.length; i += clips.length) {
      const cycle = draws.slice(i, i + clips.length);
      expect(new Set(cycle).size).toBe(clips.length);
      expect(clips).toEqual(expect.arrayContaining(cycle));
    }
    for (let i = 1; i < draws.length; i++) expect(draws[i]).not.toBe(draws[i - 1]);
  }
});
