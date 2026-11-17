interface SurfaceBuffers {
  width: number;
  height: number;
  depth: Float32Array;
  thickness: Float32Array;
  scratch: Float32Array;
  scratchThickness: Float32Array;
}

// Match filter.frag: a bounded 3x3 joint filter at strides 1, 2 and 4.
// Only the display fields change; SPH positions, forces and particle count are untouched.
export function reconstructWaterSurface(surface: SurfaceBuffers, spacing: number) {
  if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError("Positive spacing required");
  const { width, height } = surface;
  const focal = height / (2 * Math.tan((25 * Math.PI) / 180));
  const sigma = 2 * spacing;
  let sourceDepth = surface.depth;
  let sourceThickness = surface.thickness;
  let targetDepth = surface.scratch;
  let targetThickness = surface.scratchThickness;
  for (const stride of [1, 2, 4]) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = x + y * width;
        const centre = sourceDepth[index];
        if (centre === 0) {
          targetDepth[index] = 0;
          targetThickness[index] = 0;
          continue;
        }
        const footprint = Math.max(1, Math.min(3, Math.ceil((0.2 * spacing * focal) / centre)));
        const step = footprint * stride;
        let depth = 0;
        let thickness = 0;
        let weights = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const xx = Math.max(0, Math.min(width - 1, x + ox * step));
            const yy = Math.max(0, Math.min(height - 1, y + oy * step));
            const sample = xx + yy * width;
            if (sourceDepth[sample] === 0) continue;
            let spatial = 1;
            if (ox === 0) spatial *= 2;
            if (oy === 0) spatial *= 2;
            const difference = (sourceDepth[sample] - centre) / sigma;
            const weight = spatial * Math.exp(-0.5 * difference * difference);
            depth += weight * sourceDepth[sample];
            thickness += weight * sourceThickness[sample];
            weights += weight;
          }
        }
        targetDepth[index] = depth / weights;
        targetThickness[index] = thickness / weights;
      }
    }
    const previousDepth = sourceDepth;
    const previousThickness = sourceThickness;
    sourceDepth = targetDepth;
    sourceThickness = targetThickness;
    targetDepth = previousDepth;
    targetThickness = previousThickness;
  }
  surface.depth.set(sourceDepth);
  surface.thickness.set(sourceThickness);
}
