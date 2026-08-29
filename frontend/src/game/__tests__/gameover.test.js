import { settlementCutscene } from '../../hooks/useGame';

// The definitive end-of-match cinematic must ALWAYS be the portal finale (g2_portal_2),
// never the chopper extraction — regardless of who ran out of money.
test('game over always triggers the portal finale, never chopper', () => {
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 0, W: 100, E: 50 } })).toEqual({ key: 'portal' });
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 100, W: 0, E: 50 } })).toEqual({ key: 'portal' });
  expect(settlementCutscene({ gameOver: true, bankrolls: { P: 0, W: 0, E: 0 } })).toEqual({ key: 'portal' });
  expect(settlementCutscene({ gameOver: true })).toEqual({ key: 'portal' });
});
