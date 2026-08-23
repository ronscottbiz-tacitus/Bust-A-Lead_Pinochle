// Dynamic "books to save / to make" scoring helpers.
export function booksToMake({ bid, meldTotal }) {
  return Math.max(0, (bid || 0) - (meldTotal || 0));
}
export function saveTarget({ bid, meldTotal, goingDouble }) {
  const floor = goingDouble ? 31 : 20;
  return Math.max(floor, (bid || 0) - (meldTotal || 0));
}
