import { Volume, makeGrid, fillVolume, type Preset } from "./model.ts";
import { histogram } from "./statistics.ts";
import { extractSurface } from "./surface.ts";

// The caller mounts this after hydration; SSR never allocates a two-million-sample array.
export function createDataset(side: number, preset: Preset, withSurface: boolean) {
  const volume = new Volume(makeGrid(side));
  fillVolume(volume, preset);
  return {
    volume,
    statistics: histogram(volume),
    mesh: withSurface ? extractSurface(volume) : null,
  };
}
