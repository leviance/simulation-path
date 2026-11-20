import {
  add,
  at,
  cameraBasis,
  cross,
  length,
  type measuredChord,
  multiply,
  normalize,
  subtract,
  type Hit,
  type Ray,
} from "../../../lib/labs/ray-intersections.ts";
import type { Color, Raster } from "./raster.ts";
import { finish, quad } from "./specimens.ts";

export type Chord = ReturnType<typeof measuredChord>;
export const incident: Color = [179, 255, 239],
  interior: Color = [255, 182, 94],
  normalInk: Color = [169, 254, 139];
export function drawCollimator(r: Raster, ray: Ray) {
  const basis = cameraBasis({
    ...r.camera,
    origin: ray.origin,
    target: add(ray.origin, ray.direction),
  });
  const point = (z: number, radius: number, angle: number) =>
    add(
      at(ray, z),
      add(
        multiply(basis.right, radius * Math.cos(angle)),
        multiply(basis.up, radius * Math.sin(angle)),
      ),
    );
  const axial = [-0.59, -0.54, -0.29, -0.24, -0.07, 0],
    radius = [0.14, 0.19, 0.19, 0.14, 0.14, 0.105];
  const colors: Color[] = [
    [93, 112, 122],
    [67, 87, 101],
    [195, 140, 69],
    [74, 97, 106],
    [235, 174, 81],
  ];
  for (let i = 0; i < 14; i++) {
    const angle = (i * 2 * Math.PI) / 14,
      next = ((i + 1) * 2 * Math.PI) / 14;
    for (let j = 0; j < axial.length - 1; j++) {
      const a = point(axial[j], radius[j], angle),
        b = point(axial[j], radius[j], next);
      const c = point(axial[j + 1], radius[j + 1], next),
        d = point(axial[j + 1], radius[j + 1], angle);
      const n = normalize(cross(subtract(b, a), subtract(d, a)));
      quad(r, a, b, c, d, finish(r.camera, a, n, colors[j]));
    }
    r.triangle(
      at(ray, axial[0]),
      point(axial[0], radius[0], angle),
      point(axial[0], radius[0], next),
      [51, 66, 78],
    );
    r.triangle(ray.origin, point(0, 0.105, angle), point(0, 0.105, next), [149, 229, 218]);
  }
}

export function drawBeam(
  r: Raster,
  ray: Ray,
  hits: (Hit | null)[],
  best: Hit | null,
  chord: Chord,
  selected: number,
  debug: boolean,
) {
  const start = at(ray, ray.tMin),
    stop = at(ray, (best ?? hits[selected])?.t ?? ray.tMax);
  r.line(start, at(ray, ray.tMax), [94, 131, 143], debug);
  r.line(start, stop, [48, 130, 138], debug, 2);
  r.line(start, stop, incident, debug);
  r.marker(ray.origin, [230, 255, 241], 3);
  r.marker(ray.origin, [130, 223, 217], 7, "ring");
  if (chord) {
    r.line(at(ray, chord.from), at(ray, chord.until), interior, true, 1, 0.95);
    if (chord.entry !== null) r.marker(at(ray, chord.entry), [215, 253, 237], 7, "ring");
    if (chord.exit !== null) r.marker(at(ray, chord.exit), [255, 194, 109], 7, "diamond");
  }
  for (const hit of hits) {
    if (!hit) continue;
    if (hit.objectId !== (best?.objectId ?? selected)) {
      r.marker(hit.point, [161, 183, 191], 3, "ring");
      continue;
    }
    const end = add(hit.point, multiply(hit.normal, 0.65));
    r.line(hit.point, end, normalInk, true, 1, 0.76);
    let side = normalize(cross(hit.normal, r.basis.forward));
    if (length(side) < 0.001) side = r.basis.right;
    const base = subtract(end, multiply(hit.normal, 0.14));
    r.line(end, add(base, multiply(side, 0.08)), normalInk, true);
    r.line(end, subtract(base, multiply(side, 0.08)), normalInk, true);
    r.marker(hit.point, [245, 255, 231], 3);
  }
}
