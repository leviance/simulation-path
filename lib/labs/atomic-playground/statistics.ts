import type { Vec3 } from "../normal.ts";
import { radialCdf } from "./catalog.ts";
import type { Cloud } from "./session.ts";

export interface Clip {
  enabled: boolean;
  axis: "x" | "y" | "z";
  position: number;
}
export interface Probe {
  center: Vec3;
  radius: number;
}
export interface Measurement {
  total: number;
  clipped: number;
  inside: number;
  fraction: number;
  standardError: number;
  radialObserved: number[];
  radialExpected: number[];
  regionReference: number;
  regionReferenceCoarse: number;
  quadratureDifference: number;
}
export function clipVisible(point: Vec3, clip: Clip) {
  return !clip.enabled || point[clip.axis] <= clip.position;
}
export function inProbe(point: Vec3, probe: Probe) {
  return (
    Math.hypot(point.x - probe.center.x, point.y - probe.center.y, point.z - probe.center.z) <=
    probe.radius
  );
}
export function regionReference(cloud: Cloud, probe: Probe, radialStride = 8, angularStride = 8) {
  const table = cloud.tables,
    nr = table.radialBins,
    np = table.phiBins,
    nm = table.muBins;
  let sum = 0;
  for (let radial = 0; radial < nr; radial += radialStride) {
    const rEnd = Math.min(nr, radial + radialStride),
      r = ((radial + rEnd) * 0.5 * table.rMax) / nr;
    const radialMass = table.radial.cdf[rEnd] - table.radial.cdf[radial];
    for (let mu = 0; mu < nm; mu += angularStride)
      for (let phi = 0; phi < np; phi += angularStride) {
        const mEnd = Math.min(nm, mu + angularStride),
          pEnd = Math.min(np, phi + angularStride);
        let mass = 0;
        for (let m = mu; m < mEnd; ++m)
          mass += table.angular.cdf[m * np + pEnd] - table.angular.cdf[m * np + phi];
        const cosine = -1 + (mu + mEnd) / nm,
          angle = (Math.PI * (phi + pEnd)) / np;
        const side = Math.sqrt(Math.max(0, 1 - cosine * cosine));
        if (
          inProbe(
            { x: r * side * Math.cos(angle), y: r * side * Math.sin(angle), z: r * cosine },
            probe,
          )
        )
          sum += radialMass * mass;
      }
  }
  return sum;
}
export function measureCloud(cloud: Cloud, clip: Clip, probe: Probe): Measurement {
  const bins = 12,
    radialObserved = Array(bins).fill(0) as number[];
  let clipped = 0,
    inside = 0;
  for (let index = 0; index < cloud.count; ++index) {
    const offset = index * 8,
      point = {
        x: cloud.records[offset],
        y: cloud.records[offset + 1],
        z: cloud.records[offset + 2],
      };
    if (clipVisible(point, clip)) ++clipped;
    if (inProbe(point, probe)) ++inside;
    const r = Math.hypot(point.x, point.y, point.z);
    ++radialObserved[Math.min(bins - 1, Math.floor((r / cloud.tables.rMax) * bins))];
  }
  const mass = radialCdf(cloud.config.orbital, cloud.tables.rMax);
  const radialExpected = Array.from(
    { length: bins },
    (_, bin) =>
      (radialCdf(cloud.config.orbital, ((bin + 1) / bins) * cloud.tables.rMax) -
        radialCdf(cloud.config.orbital, (bin / bins) * cloud.tables.rMax)) /
      mass,
  );
  const fraction = inside / cloud.count;
  // Centered spheres have an exact radial reference; other regions use labelled quadrature.
  const centered = Math.hypot(probe.center.x, probe.center.y, probe.center.z) < 1e-12;
  const fine = centered
    ? radialCdf(cloud.config.orbital, Math.min(probe.radius, cloud.tables.rMax)) / mass
    : regionReference(cloud, probe, 8, 4);
  const coarse = centered ? fine : regionReference(cloud, probe, 16, 8);
  return {
    total: cloud.count,
    clipped,
    inside,
    fraction,
    standardError: Math.sqrt((fraction * (1 - fraction)) / cloud.count),
    radialObserved: radialObserved.map((value) => value / cloud.count),
    radialExpected,
    regionReference: fine,
    regionReferenceCoarse: coarse,
    quadratureDifference: Math.abs(fine - coarse),
  };
}
