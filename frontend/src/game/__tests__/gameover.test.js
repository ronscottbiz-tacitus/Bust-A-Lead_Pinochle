import { settlementCutscene } from '../../hooks/useGame';

// The definitive end-of-match cinematic must ALWAYS be a full-screen victory outro
// (game_over_1 or game_over_2), never the retired chopper — regardless of who ran out of money.
test('game over always triggers a full-screen match outro (game_over_1 or game_over_2)', () => {
  const OUTROS = ['game_over_1', 'game_over_2'];
  const states = [
    { gameOver: true, bankrolls: { P: 0, W: 100, E: 50 } },
    { gameOver: true, bankrolls: { P: 100, W: 0, E: 50 } },
    { gameOver: true, bankrolls: { P: 0, W: 0, E: 0 } },
    { gameOver: true },
  ];
  // Run many times to cover the 50/50 random pick.
  for (let i = 0; i < 50; i++) {
    for (const st of states) {
      const cs = settlementCutscene(st);
      expect(OUTROS).toContain(cs.key);
    }
  }
});
