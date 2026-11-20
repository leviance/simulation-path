// The two-item fixture in Project 70 tests/tests.cpp: no margins, one gap and no flex-shrink.
export const bases = [20, 30] as const;
export const gap = 10;
export function shareLine(available: number, secondGrow: number) {
  const occupied = bases[0] + gap + bases[1];
  const remainder = Math.max(0, available - occupied);
  const perWeight = remainder / (1 + secondGrow);
  const first = bases[0] + perWeight;
  const second = bases[1] + secondGrow * perWeight;
  return { first, second, remainder, overflow: Math.max(0, occupied - available) };
}
