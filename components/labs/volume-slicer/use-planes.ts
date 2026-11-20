import { useMemo } from "react";
import { axesFor, sampleSlice } from "@/lib/labs/volume-slicer/sampling";
import { sphereField } from "@/lib/labs/volume-slicer/field";
import { colorImage, type DisplayWindow } from "@/lib/labs/volume-slicer/display";
import type { Vec3, Volume } from "@/lib/labs/volume-slicer/model";

export function usePlane(
  volume: Volume | undefined,
  stage: number,
  view: number,
  probe: Vec3,
  linear: boolean,
  window: DisplayWindow,
  colored: boolean,
) {
  const fixed = probe[axesFor(view).fixed];
  const raw = useMemo(() => {
    if (stage < 3 && view !== 0) return new Float32Array();
    const point: Vec3 = [0, 0, 0];
    point[axesFor(view).fixed] = fixed;
    if (volume) return sampleSlice(volume, view, point, linear);
    if (stage !== 1) return new Float32Array();
    const image = new Float32Array(256 * 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++)
        image[x + y * 256] = sphereField([
          -80 + (160 * (x + 0.5)) / 256,
          -96 + 192 * (1 - (y + 0.5) / 256),
          fixed,
        ]);
    return image;
  }, [volume, stage, view, fixed, linear]);
  const rgba = useMemo(() => colorImage(raw, window, colored), [raw, window, colored]);
  return { raw, rgba };
}
