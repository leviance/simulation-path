import { boxInterval, objectBeam, rotateY, type Beam, type Material, type Point } from "./model.ts";
import type { RadioPart } from "./radio.ts";

const paint: Record<RadioPart, Point> = {
  case: [0.27, 0.41, 0.5],
  cover: [0.47, 0.68, 0.76],
  aerial: [0.37, 0.48, 0.54],
  board: [0.17, 0.72, 0.56],
  chip: [0.29, 0.37, 0.52],
  cell: [0.96, 0.64, 0.31],
  contact: [0.99, 0.83, 0.51],
  grille: [0.68, 0.81, 0.86],
  display: [0.22, 0.64, 0.75],
  key: [0.78, 0.53, 0.38],
};
const sinPitch = Math.sin(0.21);
const cosPitch = Math.cos(0.21);

function referenceView(local: Point, angle: number): Point {
  const [x, y, z] = rotateY(local, angle - 0.33);
  return [x, y * cosPitch + z * sinPitch, z * cosPitch - y * sinPitch];
}

export interface RadioFace {
  corners: Point[];
  depth: number;
  fill: string;
  outline: boolean;
  crossed: boolean;
}

// Drawing this list reveals the components. The detector never reads its colours or pixels.
export function radioPlateFaces(scene: Material[], angle: number, beam: Beam) {
  const localBeam = objectBeam(beam, angle);
  const faces: RadioFace[] = [];
  for (const material of scene) {
    if (!material.part) continue;
    const crossed = boxInterval(localBeam, material.minimum, material.maximum) !== null;
    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [-1, 1]) {
        const direction: Point = [0, 0, 0];
        direction[axis] = sign;
        const normal = referenceView(direction, angle);
        if (normal[2] >= -0.00001) continue;
        const shade = Math.max(
          0.48,
          Math.min(1, 0.74 - 0.17 * normal[2] + 0.2 * normal[1] - 0.11 * normal[0]),
        );
        const corners: Point[] = [];
        const a = (axis + 1) % 3;
        const b = (axis + 2) % 3;
        for (let i = 0; i < 4; i++) {
          const point: Point = [...material.minimum];
          if (sign > 0) point[axis] = material.maximum[axis];
          if (i === 1 || i === 2) point[a] = material.maximum[a];
          if (i === 2 || i === 3) point[b] = material.maximum[b];
          corners.push(referenceView(point, angle));
        }
        faces.push({
          corners,
          depth: corners.reduce((sum, p) => sum + p[2], 0) / 4,
          fill: `rgb(${paint[material.part].map((value) => Math.round(255 * value * shade)).join(",")})`,
          outline: material.part === "cover",
          crossed,
        });
      }
    }
  }
  return faces.sort((a, b) => b.depth - a.depth);
}
