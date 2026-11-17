import type { Volume } from "./model.ts";

// Dataset-only work: never run this loop for a cut, cursor or contrast change.
export function histogram(volume: Volume) {
  const bins = new Uint32Array(64);
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of volume.values) {
    if (!Number.isFinite(value)) throw new RangeError("Histogram needs finite scalars");
    const bin = Math.min(63, Math.floor(Math.max(0, Math.min(1, value)) * 64));
    bins[bin]++;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return { bins, samples: volume.values.length, minimum, maximum };
}
